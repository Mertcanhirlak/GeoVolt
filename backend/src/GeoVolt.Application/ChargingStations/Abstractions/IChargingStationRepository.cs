using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.ChargingStations.Abstractions;
//interface, şarj istasyonları ve bağlantı noktaları ile ilgili veri erişim işlemlerini tanımlar
public interface IChargingStationRepository
{
    // Tüm istasyonları veya bölge ve mahalleye göre filtrelenmiş istasyonları getirir
    Task<IReadOnlyList<ChargingStation>> GetAllAsync(
        int? regionId = null,
        int? neighborhoodId = null,
        CancellationToken cancellationToken = default);

    // Id değerine göre tek istasyonu getirir
    Task<ChargingStation?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);
}
