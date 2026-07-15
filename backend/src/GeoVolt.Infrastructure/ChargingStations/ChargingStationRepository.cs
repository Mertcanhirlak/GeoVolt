using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.ChargingStations;

public sealed class ChargingStationRepository : IChargingStationRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public ChargingStationRepository(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ChargingStation>> GetAllAsync(
        int? regionSourceId = null,
        int? neighborhoodSourceId = null,
        CancellationToken cancellationToken = default)
    {
        var query = CreateReadQuery();

        if (regionSourceId.HasValue)
        {
            query = query.Where(station =>
                station.Region.SourceId == regionSourceId.Value);
        }

        if (neighborhoodSourceId.HasValue)
        {
            query = query.Where(station =>
                station.Neighborhood.SourceId == neighborhoodSourceId.Value);
        }

        return await query
            .OrderBy(station => station.Name)
            .ThenBy(station => station.SourceStationNumber)
            .ToListAsync(cancellationToken);
    }

    public async Task<ChargingStation?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await CreateReadQuery()
            .FirstOrDefaultAsync(
                station => station.Id == id,
                cancellationToken);
    }

    private IQueryable<ChargingStation> CreateReadQuery()
    {
        return _dbContext.ChargingStations
            .AsNoTracking()
            .Include(station => station.Region)
            .Include(station => station.Neighborhood)
            .Include(station => station.Connectors)
            .AsSplitQuery();
    }
}
