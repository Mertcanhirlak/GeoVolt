using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Models;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;
// Bölge verilerini yönetmek için repository sınıfı
namespace GeoVolt.Infrastructure.Regions;

public sealed class RegionRepository : IRegionRepository
{
    private readonly IReadOnlyList<Region> _regions;

    private readonly IReadOnlyDictionary<int, RegionSummaryData> _regionSummaries;

    public RegionRepository()
    {
        // WGS84 koordinat sistemi için geometry factory oluşturur
        var geometryFactory = new GeometryFactory(
            new PrecisionModel(),
            4326);

        // Gerçek PostGIS verileri gelene kadar geçici bölge verileri
        _regions = new List<Region>
        {
            new()
            {
                Id = 1,
                Name = "Çukurambar",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.7950,
                    39.9000,
                    32.8150,
                    39.9150)
            },

            new()
            {
                Id = 2,
                Name = "Balgat",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8150,
                    39.9000,
                    32.8400,
                    39.9200)
            },

            new()
            {
                Id = 3,
                Name = "Söğütözü",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.7850,
                    39.9100,
                    32.8050,
                    39.9300)
            }
        };

        // Gerçek statik trafik verileri gelene kadar geçici bölge verileri
        _regionSummaries = new Dictionary<int, RegionSummaryData>
        {
            [1] = new RegionSummaryData
            {
                TrafficLevel = "Yüksek"
            },

            [2] = new RegionSummaryData
            {
                TrafficLevel = "Orta"
            },

            [3] = new RegionSummaryData
            {
                TrafficLevel = "Yüksek"
            }
        };
    }

    public Task<IReadOnlyList<Region>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        // Tüm bölgeleri döndürür
        return Task.FromResult(_regions);
    }

    public Task<Region?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre bölgeyi bulur
        var region = _regions.FirstOrDefault(
            region => region.Id == id);

        return Task.FromResult(region);
    }

    public Task<RegionSummaryData?> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre statik bölge özetini bulur
        _regionSummaries.TryGetValue(
            id,
            out var summary);

        return Task.FromResult(summary);
    }

    private static Polygon CreateMockRectangle(
        GeometryFactory geometryFactory,
        double minLongitude,
        double minLatitude,
        double maxLongitude,
        double maxLatitude)
    {
        // Gerçek GIS sınır verileri gelene kadar geçici dikdörtgen mock geometri oluşturur
        var coordinates = new[]
        {
            new Coordinate(minLongitude, minLatitude),
            new Coordinate(maxLongitude, minLatitude),
            new Coordinate(maxLongitude, maxLatitude),
            new Coordinate(minLongitude, maxLatitude),

            // Polygon kapanması için ilk koordinat tekrar eklenir
            new Coordinate(minLongitude, minLatitude)
        };

        // Polygon dış sınırını oluşturur
        var shell = geometryFactory.CreateLinearRing(
            coordinates);

        // Geçici mock polygon verisini döndürür
        return geometryFactory.CreatePolygon(shell);
    }
}