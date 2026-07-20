using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.Neighborhoods;

public sealed class NeighborhoodRepository : INeighborhoodRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public NeighborhoodRepository(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Neighborhood>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Neighborhoods
            .AsNoTracking()
            .Include(neighborhood => neighborhood.Region)
            .OrderBy(neighborhood => neighborhood.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Neighborhood>> GetByRegionSourceIdAsync(
        int regionSourceId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Neighborhoods
            .AsNoTracking()
            .Include(neighborhood => neighborhood.Region)
            .Where(neighborhood => neighborhood.Region.SourceId == regionSourceId)
            .OrderBy(neighborhood => neighborhood.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Neighborhood?> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Neighborhoods
            .AsNoTracking()
            .Include(neighborhood => neighborhood.Region)
            .FirstOrDefaultAsync(neighborhood => neighborhood.SourceId == sourceId, cancellationToken);
    }
}
