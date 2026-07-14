using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.Regions;

// Bölge verilerine PostGIS üzerinden erişir.
public sealed class RegionRepository : IRegionRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public RegionRepository(
        GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Region>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        // Tüm bölgeleri kaynak kimliğine göre sıralar.
        return await _dbContext.Regions
            .AsNoTracking()
            .OrderBy(region => region.SourceId)
            .ToListAsync(cancellationToken);
    }

    public async Task<Region?> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default)
    {
        // Kaynak kimliğine göre bölgeyi getirir.
        return await _dbContext.Regions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                region => region.SourceId == sourceId,
                cancellationToken);
    }
}