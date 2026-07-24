using GeoVolt.Application.DataImports.Abstractions;
using GeoVolt.Application.DataImports.Models;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.DataImports;

public sealed class DataImportQueryService : IDataImportQueryService
{
    private readonly GeoVoltDbContext _dbContext;

    public DataImportQueryService(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<DatasetImportSummary>> GetRecentAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var safeLimit = Math.Clamp(limit, 1, 100);

        return await _dbContext.DatasetImports
            .AsNoTracking()
            .OrderByDescending(item => item.ImportedAtUtc)
            .Take(safeLimit)
            .Select(item => new DatasetImportSummary(
                item.Id,
                item.DatasetName,
                item.SourceFile,
                item.FeatureCount,
                item.SourceSrid,
                item.TargetSrid,
                item.ImportedAtUtc,
                item.Status,
                item.ErrorMessage))
            .ToListAsync(cancellationToken);
    }
}
