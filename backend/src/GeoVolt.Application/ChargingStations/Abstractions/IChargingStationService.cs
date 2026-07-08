using GeoVolt.Application.ChargingStations.Dtos;

namespace GeoVolt.Application.ChargingStations.Abstractions;
//interface, şarj istasyonları ile ilgili iş mantığı işlemlerini tanımlar
public interface IChargingStationService
{
    // Tüm istasyonları veya bölgeye göre filtrelenmiş istasyonları getirir
    Task<IReadOnlyList<ChargingStationResponseDto>> GetAllAsync(
        int? regionId = null,
        CancellationToken cancellationToken = default);

    // Id değerine göre tek istasyonun detayını getirir
    Task<ChargingStationDetailResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);
}