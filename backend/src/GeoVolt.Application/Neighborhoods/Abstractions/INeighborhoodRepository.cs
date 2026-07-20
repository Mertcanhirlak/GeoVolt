using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Neighborhoods.Abstractions;
// interface, mahalleler ile ilgili veri erişim işlemlerini tanımlar
public interface INeighborhoodRepository
{
    Task<IReadOnlyList<Neighborhood>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // Belirtilen bölgeye bağlı mahalleleri getirir
    Task<IReadOnlyList<Neighborhood>> GetByRegionSourceIdAsync(
        int regionSourceId,
        CancellationToken cancellationToken = default);

    // Id değerine göre tek mahalleyi getirir
    Task<Neighborhood?> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);
}
