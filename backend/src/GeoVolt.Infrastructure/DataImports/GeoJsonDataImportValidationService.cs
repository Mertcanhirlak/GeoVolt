using System.Security.Cryptography;
using System.Text.Json;
using GeoVolt.Application.DataImports.Abstractions;
using GeoVolt.Application.DataImports.Models;

namespace GeoVolt.Infrastructure.DataImports;

public sealed class GeoJsonDataImportValidationService : IDataImportValidationService
{
    public async Task<DatasetValidationResult> ValidateGeoJsonAsync(
        Stream stream,
        string fileName,
        CancellationToken cancellationToken)
    {
        var safeFileName = Path.GetFileName(fileName);
        var definition = DatasetDefinitions.FindByFileName(safeFileName);
        var errors = new List<string>();
        var warnings = new List<string>();

        if (definition is null)
        {
            errors.Add($"'{safeFileName}' tanımlı bir GeoVolt veri seti değil.");
        }

        await using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken);

        if (buffer.Length == 0)
        {
            errors.Add("Dosya boş.");
        }

        if (buffer.Length > DataImportLimits.MaximumGeoJsonFileSizeBytes)
        {
            errors.Add($"Dosya boyutu {DataImportLimits.MaximumGeoJsonFileSizeBytes / 1024 / 1024} MB sınırını aşıyor.");
        }

        var bytes = buffer.ToArray();
        var sha256 = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        var featureCount = 0;
        var geometryTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var detectedProperties = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (buffer.Length == 0 || buffer.Length > DataImportLimits.MaximumGeoJsonFileSizeBytes)
        {
            return CreateResult();
        }

        try
        {
            using var document = JsonDocument.Parse(bytes, new JsonDocumentOptions
            {
                AllowTrailingCommas = false,
                CommentHandling = JsonCommentHandling.Disallow,
                MaxDepth = 64
            });

            var root = document.RootElement;
            if (!TryGetString(root, "type", out var rootType)
                || !string.Equals(rootType, "FeatureCollection", StringComparison.OrdinalIgnoreCase))
            {
                errors.Add("GeoJSON kök tipi 'FeatureCollection' olmalıdır.");
            }

            if (!root.TryGetProperty("features", out var features)
                || features.ValueKind != JsonValueKind.Array)
            {
                errors.Add("GeoJSON içinde 'features' dizisi bulunamadı.");
                return CreateResult();
            }

            foreach (var feature in features.EnumerateArray())
            {
                cancellationToken.ThrowIfCancellationRequested();
                featureCount++;

                if (!feature.TryGetProperty("geometry", out var geometry)
                    || geometry.ValueKind == JsonValueKind.Null)
                {
                    AddError($"{featureCount}. kaydın geometrisi boş.");
                    continue;
                }

                if (TryGetString(geometry, "type", out var geometryType))
                {
                    geometryTypes.Add(geometryType!);
                }
                else
                {
                    AddError($"{featureCount}. kaydın geometri tipi bulunamadı.");
                }

                if (!feature.TryGetProperty("properties", out var properties)
                    || properties.ValueKind != JsonValueKind.Object)
                {
                    AddError($"{featureCount}. kaydın properties alanı bulunamadı.");
                    continue;
                }

                var featureProperties = properties.EnumerateObject()
                    .Select(property => property.Name)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
                detectedProperties.UnionWith(featureProperties);

                if (definition is not null)
                {
                    var missing = definition.RequiredProperties
                        .Where(required => !featureProperties.Contains(required))
                        .ToArray();

                    if (missing.Length > 0)
                    {
                        AddError($"{featureCount}. kayıtta zorunlu alan eksik: {string.Join(", ", missing)}.");
                    }
                }
            }

            if (featureCount == 0)
            {
                errors.Add("GeoJSON herhangi bir kayıt içermiyor.");
            }

            if (definition is not null)
            {
                var unexpectedTypes = geometryTypes
                    .Where(type => !definition.AllowedGeometryTypes.Contains(type))
                    .ToArray();

                if (unexpectedTypes.Length > 0)
                {
                    errors.Add($"Beklenmeyen geometri tipi: {string.Join(", ", unexpectedTypes)}. Beklenen: {string.Join(", ", definition.AllowedGeometryTypes)}.");
                }
            }

            if (!root.TryGetProperty("crs", out _))
            {
                warnings.Add("CRS bilgisi belirtilmemiş; GeoJSON standardı gereği CRS84/EPSG:4326 kabul edilecek.");
            }
        }
        catch (JsonException exception)
        {
            errors.Add($"Dosya geçerli JSON değil: {exception.Message}");
        }

        return CreateResult();

        void AddError(string error)
        {
            if (errors.Count < 100)
            {
                errors.Add(error);
            }
        }

        DatasetValidationResult CreateResult()
        {
            return new DatasetValidationResult(
                errors.Count == 0,
                safeFileName,
                definition?.Code,
                buffer.Length,
                sha256,
                featureCount,
                geometryTypes.OrderBy(value => value).ToArray(),
                detectedProperties.OrderBy(value => value).ToArray(),
                errors.ToArray(),
                warnings.ToArray());
        }
    }

    private static bool TryGetString(JsonElement element, string propertyName, out string? value)
    {
        value = null;
        if (!element.TryGetProperty(propertyName, out var property)
            || property.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        value = property.GetString();
        return !string.IsNullOrWhiteSpace(value);
    }
}
