
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Regions.Abstractions;

// Bölge verilerine erişim işlemlerini tanımlar.
public interface IRegionRepository
{
    // Tüm bölgeleri getirir.
    Task<IReadOnlyList<Region>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // Kaynak sistemdeki kimliğe göre bölgeyi getirir.
    Task<Region?> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);
}