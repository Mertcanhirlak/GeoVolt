using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Models;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.Regions;

public sealed class RegionRepository : IRegionRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public RegionRepository(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Region>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Regions
            .AsNoTracking()
            .OrderBy(region => region.SourceId)
            .ToListAsync(cancellationToken);
    }

    public async Task<Region?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Regions
            .AsNoTracking()
            .FirstOrDefaultAsync(region => region.SourceId == id, cancellationToken);
    }

    public async Task<RegionSummaryData?> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var exists = await _dbContext.Regions
            .AsNoTracking()
            .AnyAsync(region => region.SourceId == id, cancellationToken);

        return exists
            ? new RegionSummaryData { TrafficLevel = "Veri hazırlanıyor" }
            : null;
    }
}
