using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Models;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Geospatial;

namespace GeoVolt.Infrastructure.Regions;

public sealed class RegionRepository : IRegionRepository
{
    private readonly IReadOnlyList<Region> _regions;

    private readonly IReadOnlyDictionary<int, RegionSummaryData>
        _regionSummaries;

    public RegionRepository()
    {
        /*
         * Frontend ile aynı MAHALLE.geojson dosyasındaki gerçek
         * ID, ad ve polygon geometrileri kullanılır.
         */
        _regions = MahalleGeoJsonDataLoader.LoadRegions();

        _regionSummaries = _regions.ToDictionary(
            region => region.Id,
            _ => new RegionSummaryData
            {
                TrafficLevel = "Veri bulunamadı"
            });
    }

    public Task<IReadOnlyList<Region>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_regions);
    }

    public Task<Region?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var region = _regions.FirstOrDefault(
            currentRegion =>
                currentRegion.Id == id);

        return Task.FromResult(region);
    }

    public Task<RegionSummaryData?> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        _regionSummaries.TryGetValue(
            id,
            out var summary);

        return Task.FromResult(summary);
    }
}