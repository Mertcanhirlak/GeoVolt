using System.Text.Json;
using GeoVolt.Application.DataImports.Abstractions;
using GeoVolt.Application.DataImports.Models;
using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace GeoVolt.Infrastructure.DataImports;

public sealed class GeoJsonDataImportStagingService : IDataImportStagingService
{
    private readonly GeoVoltDbContext _dbContext;
    private readonly IDataImportValidationService _validationService;

    public GeoJsonDataImportStagingService(
        GeoVoltDbContext dbContext,
        IDataImportValidationService validationService)
    {
        _dbContext = dbContext;
        _validationService = validationService;
    }

    public async Task<DatasetStagingResult> StageGeoJsonAsync(
        Stream stream,
        string fileName,
        CancellationToken cancellationToken)
    {
        await using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken);
        buffer.Position = 0;

        var validation = await _validationService.ValidateGeoJsonAsync(
            buffer,
            fileName,
            cancellationToken);

        if (!validation.IsValid)
        {
            return Result(false, false, null, 0, "ValidationFailed", "Dosya doğrulamadan geçemedi.");
        }

        var existingImport = await _dbContext.DatasetImports
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Sha256 == validation.Sha256, cancellationToken);

        if (existingImport is not null)
        {
            if (existingImport.Status == DatasetImportStatuses.Failed)
            {
                _dbContext.DatasetImports.Remove(existingImport);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            else
            {
                return Result(
                    false,
                    true,
                    existingImport.Id,
                    existingImport.FeatureCount,
                    existingImport.Status,
                    "Bu dosya daha önce sisteme aktarılmış.");
            }
        }

        buffer.Position = 0;
        using var document = await JsonDocument.ParseAsync(buffer, cancellationToken: cancellationToken);
        var features = document.RootElement.GetProperty("features");
        var datasetImport = new DatasetImport
        {
            DatasetName = validation.DatasetCode!,
            SourceFile = validation.FileName,
            Sha256 = validation.Sha256,
            FeatureCount = validation.FeatureCount,
            SourceSrid = 4326,
            TargetSrid = 4326,
            ImportedAtUtc = DateTime.UtcNow,
            Status = DatasetImportStatuses.Staging
        };

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            _dbContext.DatasetImports.Add(datasetImport);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var featureIndex = 0;
            var connection = (NpgsqlConnection)_dbContext.Database.GetDbConnection();
            await using var importer = await connection.BeginBinaryImportAsync(
                """
                COPY staging.geojson_features
                    ("DatasetImportId", "FeatureIndex", "SourceFeatureId", "GeometryType", "PropertiesJson", "GeometryJson", "CreatedAtUtc")
                FROM STDIN (FORMAT BINARY)
                """,
                cancellationToken);

            foreach (var feature in features.EnumerateArray())
            {
                cancellationToken.ThrowIfCancellationRequested();
                featureIndex++;

                var properties = feature.GetProperty("properties");
                var geometry = feature.GetProperty("geometry");
                await importer.StartRowAsync(cancellationToken);
                await importer.WriteAsync(datasetImport.Id, NpgsqlDbType.Integer, cancellationToken);
                await importer.WriteAsync(featureIndex, NpgsqlDbType.Integer, cancellationToken);

                var sourceFeatureId = ReadSourceFeatureId(properties);
                if (sourceFeatureId is null)
                {
                    await importer.WriteNullAsync(cancellationToken);
                }
                else
                {
                    await importer.WriteAsync(sourceFeatureId, NpgsqlDbType.Varchar, cancellationToken);
                }

                await importer.WriteAsync(geometry.GetProperty("type").GetString()!, NpgsqlDbType.Varchar, cancellationToken);
                await importer.WriteAsync(properties.GetRawText(), NpgsqlDbType.Jsonb, cancellationToken);
                await importer.WriteAsync(geometry.GetRawText(), NpgsqlDbType.Jsonb, cancellationToken);
                await importer.WriteAsync(DateTime.UtcNow, NpgsqlDbType.TimestampTz, cancellationToken);
            }

            await importer.CompleteAsync(cancellationToken);
            await importer.DisposeAsync();

            datasetImport.Status = DatasetImportStatuses.Staged;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return Result(
                true,
                false,
                datasetImport.Id,
                featureIndex,
                datasetImport.Status,
                "Dosya staging alanına başarıyla aktarıldı.");
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            await transaction.RollbackAsync(cancellationToken);
            _dbContext.ChangeTracker.Clear();
            await RecordFailureAsync(validation, exception, cancellationToken);

            return Result(
                false,
                false,
                null,
                0,
                DatasetImportStatuses.Failed,
                "Staging aktarımı sırasında hata oluştu.");
        }

        DatasetStagingResult Result(
            bool success,
            bool isDuplicate,
            int? importId,
            int stagedCount,
            string status,
            string message)
        {
            return new DatasetStagingResult(
                success,
                isDuplicate,
                importId,
                stagedCount,
                status,
                message,
                validation);
        }
    }

    private async Task RecordFailureAsync(
        DatasetValidationResult validation,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var alreadyRecorded = await _dbContext.DatasetImports
            .AnyAsync(item => item.Sha256 == validation.Sha256, cancellationToken);

        if (alreadyRecorded)
        {
            return;
        }

        _dbContext.DatasetImports.Add(new DatasetImport
        {
            DatasetName = validation.DatasetCode!,
            SourceFile = validation.FileName,
            Sha256 = validation.Sha256,
            FeatureCount = validation.FeatureCount,
            SourceSrid = 4326,
            TargetSrid = 4326,
            ImportedAtUtc = DateTime.UtcNow,
            Status = DatasetImportStatuses.Failed,
            ErrorMessage = exception.Message.Length <= 4000
                ? exception.Message
                : exception.Message[..4000]
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string? ReadSourceFeatureId(JsonElement properties)
    {
        foreach (var property in properties.EnumerateObject())
        {
            if (!string.Equals(property.Name, "ID", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var value = property.Value.ValueKind switch
            {
                JsonValueKind.String => property.Value.GetString(),
                JsonValueKind.Number => property.Value.GetRawText(),
                _ => null
            };

            return value is { Length: > 200 } ? value[..200] : value;
        }

        return null;
    }
}
