using GeoVolt.Application.Neighborhoods.Dtos;

namespace GeoVolt.Application.Neighborhoods.Abstractions;

// Mahallelerle ilgili iş mantığı işlemlerini tanımlar.
public interface INeighborhoodService
{
    // Tüm mahalleleri getirir.
    Task<IReadOnlyList<NeighborhoodResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // Bölgenin kaynak kimliğine bağlı mahalleleri getirir.
    Task<IReadOnlyList<NeighborhoodResponseDto>> GetByRegionSourceIdAsync(
        int regionSourceId,
        CancellationToken cancellationToken = default);

    // Mahallenin kaynak kimliğine göre detayını getirir.
    Task<NeighborhoodDetailResponseDto> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);
}