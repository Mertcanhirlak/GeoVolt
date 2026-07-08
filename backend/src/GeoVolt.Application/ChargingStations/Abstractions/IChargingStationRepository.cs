using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.ChargingStations.Abstractions;
//interface, şarj istasyonları ve bağlantı noktaları ile ilgili veri erişim işlemlerini tanımlar
public interface IChargingStationRepository
{
    // Tüm istasyonları veya bölgeye göre filtrelenmiş istasyonları getirir
    Task<IReadOnlyList<ChargingStation>> GetAllAsync(
        int? regionId = null,
        CancellationToken cancellationToken = default);

    // Id değerine göre tek istasyonu getirir
    Task<ChargingStation?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    // Belirtilen istasyona ait bağlantı noktalarını getirir
    Task<IReadOnlyList<ChargingConnector>> GetConnectorsByStationIdAsync(
        int chargingStationId,
        CancellationToken cancellationToken = default);
}