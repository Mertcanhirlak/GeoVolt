using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Neighborhoods.Abstractions;

// Mahalle veri erişim işlemlerini tanımlar.
public interface INeighborhoodRepository
{
    // Tüm mahalleleri getirir.
    Task<IReadOnlyList<Neighborhood>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // Bölgenin kaynak kimliğine bağlı mahalleleri getirir.
    Task<IReadOnlyList<Neighborhood>> GetByRegionSourceIdAsync(
        int regionSourceId,
        CancellationToken cancellationToken = default);

    // Mahallenin kaynak kimliğine göre tek mahalleyi getirir.
    Task<Neighborhood?> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);
}