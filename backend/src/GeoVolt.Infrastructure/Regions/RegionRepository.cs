using GeoVolt.Application.Regions.Abstractions;
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

    public async Task<Region?> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Regions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                region => region.SourceId == sourceId,
                cancellationToken);
    }
}
