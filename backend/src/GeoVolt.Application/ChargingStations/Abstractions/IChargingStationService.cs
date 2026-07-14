using GeoVolt.Application.ChargingStations.Dtos;

namespace GeoVolt.Application.ChargingStations.Abstractions;

// Şarj istasyonlarıyla ilgili iş mantığı işlemlerini tanımlar.
public interface IChargingStationService
{
    // İstasyonları bölge ve mahalle kaynak kimliklerine göre getirir.
    Task<IReadOnlyList<ChargingStationResponseDto>> GetAllAsync(
        int? regionSourceId = null,
        int? neighborhoodSourceId = null,
        CancellationToken cancellationToken = default);

    // Internal veritabanı kimliğine göre istasyon detayını getirir.
    Task<ChargingStationDetailResponseDto> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);
}