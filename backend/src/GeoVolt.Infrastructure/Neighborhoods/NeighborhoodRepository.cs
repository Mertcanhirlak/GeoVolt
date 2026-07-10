using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Geospatial;

namespace GeoVolt.Infrastructure.Neighborhoods;

public sealed class NeighborhoodRepository : INeighborhoodRepository
{
    private readonly IReadOnlyList<Neighborhood> _neighborhoods;

    public NeighborhoodRepository()
    {
        /*
         * Geçici olarak her MAHALLE.geojson polygonu aynı ID ile
         * hem bölge hem mahalle olarak kullanılmaktadır.
         *
         * Böylece manuel pin değerlendirmesinde seçilen polygonun
         * gerçek adı ve gerçek geometrisi döner.
         */
        _neighborhoods =
            MahalleGeoJsonDataLoader.LoadNeighborhoods();
    }

    public Task<IReadOnlyList<Neighborhood>> GetByRegionIdAsync(
        int regionId,
        CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Neighborhood> neighborhoods =
            _neighborhoods
                .Where(neighborhood =>
                    neighborhood.RegionId == regionId)
                .ToList();

        return Task.FromResult(
            neighborhoods);
    }

    public Task<Neighborhood?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var neighborhood =
            _neighborhoods.FirstOrDefault(
                currentNeighborhood =>
                    currentNeighborhood.Id == id);

        return Task.FromResult(
            neighborhood);
    }
}