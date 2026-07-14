using GeoVolt.Application.Regions.Dtos;

namespace GeoVolt.Application.Regions.Abstractions;

public interface IRegionService
{
    Task<IReadOnlyList<RegionResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<RegionResponseDto> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);

    Task<RegionSummaryResponseDto> GetSummaryBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);

    Task<LocateRegionPointResponseDto> LocatePointAsync(
        int regionSourceId,
        RegionPointRequestDto request,
        CancellationToken cancellationToken = default);
}
