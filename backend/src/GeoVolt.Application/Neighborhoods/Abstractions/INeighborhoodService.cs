using GeoVolt.Application.Neighborhoods.Dtos;

namespace GeoVolt.Application.Neighborhoods.Abstractions;
// interface, mahalleler ile ilgili servis işlemlerini tanımlar
public interface INeighborhoodService
{
    Task<IReadOnlyList<NeighborhoodResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // Belirtilen bölgeye bağlı mahalleleri getirir
    Task<IReadOnlyList<NeighborhoodResponseDto>> GetByRegionSourceIdAsync(
        int regionSourceId,
        CancellationToken cancellationToken = default);

    // Id değerine göre tek mahallenin detayını getirir
    Task<NeighborhoodDetailResponseDto> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);
}
