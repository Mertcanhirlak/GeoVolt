using GeoVolt.Application.Regions.Dtos;

namespace GeoVolt.Application.Regions.Abstractions;

public interface IRegionService
{
    // Tüm bölgeleri getirir
    Task<IReadOnlyList<RegionResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // Id değerine göre tek bölgeyi getirir
    Task<RegionResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    // Bölgenin özet bilgilerini getirir
    Task<RegionSummaryResponseDto?> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken = default);

    // Verilen koordinatın seçilen bölge sınırları içinde
    // olup olmadığını kontrol eder
    Task<ValidateRegionPointResponseDto?> ValidatePointAsync(
        int regionId,
        ValidateRegionPointRequestDto request,
        CancellationToken cancellationToken = default);
    // Verilen noktanın seçilen bölge içinde olup olmadığını
    // ve hangi mahalleye denk geldiğini bulur
    Task<LocateRegionPointResponseDto?> LocatePointAsync(
        int regionId,
        ValidateRegionPointRequestDto request,
        CancellationToken cancellationToken = default);
}