using GeoVolt.Application.Regions.Dtos;

namespace GeoVolt.Application.Regions.Abstractions;

// Bölgeyle ilgili iş mantığı işlemlerini tanımlar.
public interface IRegionService
{
    // Tüm bölgeleri getirir.
    Task<IReadOnlyList<RegionResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // Kaynak kimliğine göre tek bölgeyi getirir.
    Task<RegionResponseDto> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);

    // Kaynak kimliğine göre bölge özetini getirir.
    Task<RegionSummaryResponseDto> GetSummaryBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);

    // Noktanın seçilen bölge içinde olup olmadığını
    // ve hangi mahalleye denk geldiğini bulur.
    Task<LocateRegionPointResponseDto> LocatePointAsync(
        int regionSourceId,
        RegionPointRequestDto request,
        CancellationToken cancellationToken = default);
}