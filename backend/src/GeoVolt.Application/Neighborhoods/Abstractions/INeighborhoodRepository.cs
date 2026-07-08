using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Neighborhoods.Abstractions;
// interface, mahalleler ile ilgili veri erişim işlemlerini tanımlar
public interface INeighborhoodRepository
{
    // Belirtilen bölgeye bağlı mahalleleri getirir
    Task<IReadOnlyList<Neighborhood>> GetByRegionIdAsync(
        int regionId,
        CancellationToken cancellationToken = default);

    // Id değerine göre tek mahalleyi getirir
    Task<Neighborhood?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);
}