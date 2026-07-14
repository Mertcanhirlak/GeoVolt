using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.ChargingStations.Abstractions;

// Şarj istasyonu ve connector veri erişim işlemlerini tanımlar.
public interface IChargingStationRepository
{
    // İstasyonları bölge ve mahalle kaynak kimliklerine göre getirir.
    Task<IReadOnlyList<ChargingStation>> GetAllAsync(
        int? regionSourceId = null,
        int? neighborhoodSourceId = null,
        CancellationToken cancellationToken = default);

    // Internal veritabanı kimliğine göre istasyonu getirir.
    Task<ChargingStation?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    // Internal istasyon kimliğine bağlı connectorları getirir.
    Task<IReadOnlyList<ChargingConnector>> GetConnectorsByStationIdAsync(
        int chargingStationId,
        CancellationToken cancellationToken = default);
}