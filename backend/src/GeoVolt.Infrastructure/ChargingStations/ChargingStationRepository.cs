using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.ChargingStations;

// Şarj istasyonlarının veri erişim işlemlerini gerçekleştirir.
public sealed class ChargingStationRepository : IChargingStationRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public ChargingStationRepository(
        GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ChargingStation>> GetAllAsync(
        int? regionSourceId = null,
        int? neighborhoodSourceId = null,
        CancellationToken cancellationToken = default)
    {
        // İstasyonları ilişkili bölge ve mahalle bilgileriyle sorgular.
        var query = _dbContext.ChargingStations
            .AsNoTracking()
            .Include(station => station.Region)
            .Include(station => station.Neighborhood)
            .AsQueryable();

        // Bölgenin public kaynak kimliğine göre filtreler.
        if (regionSourceId.HasValue)
        {
            query = query.Where(station =>
                station.Region.SourceId == regionSourceId.Value);
        }

        // Mahallenin public kaynak kimliğine göre filtreler.
        if (neighborhoodSourceId.HasValue)
        {
            query = query.Where(station =>
                station.Neighborhood.SourceId ==
                neighborhoodSourceId.Value);
        }

        return await query
            .OrderBy(station => station.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<ChargingStation?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // İstasyonu internal veritabanı kimliğine göre getirir.
        return await _dbContext.ChargingStations
            .AsNoTracking()
            .Include(station => station.Region)
            .Include(station => station.Neighborhood)
            .FirstOrDefaultAsync(
                station => station.Id == id,
                cancellationToken);
    }

    public async Task<IReadOnlyList<ChargingConnector>>
        GetConnectorsByStationIdAsync(
            int chargingStationId,
            CancellationToken cancellationToken = default)
    {
        // İstasyona bağlı connectorları getirir.
        return await _dbContext.ChargingConnectors
            .AsNoTracking()
            .Where(connector =>
                connector.ChargingStationId == chargingStationId)
            .OrderBy(connector => connector.Id)
            .ToListAsync(cancellationToken);
    }
}