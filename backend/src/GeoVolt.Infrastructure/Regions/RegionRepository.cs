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

        // Excel'deki 15 semt/bölge yapısına göre geçici mock veriler
        // Polygon koordinatları gerçek GIS sınırları değildir
        _regions = new List<Region>
        {
            new()
            {
                Id = 1,
                Name = "Kızılay",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8450,
                    39.9150,
                    32.8600,
                    39.9280)
            },

            new()
            {
                Id = 2,
                Name = "Kavaklıdere",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8600,
                    39.9150,
                    32.8750,
                    39.9280)
            },

            new()
            {
                Id = 3,
                Name = "Ayrancı",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8450,
                    39.9000,
                    32.8600,
                    39.9130)
            },

            new()
            {
                Id = 4,
                Name = "Gaziosmanpaşa",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8750,
                    39.9000,
                    32.8900,
                    39.9130)
            },

            new()
            {
                Id = 5,
                Name = "Bahçelievler",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8250,
                    39.9150,
                    32.8400,
                    39.9280)
            },

            new()
            {
                Id = 6,
                Name = "Cebeci",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8750,
                    39.9150,
                    32.8900,
                    39.9280)
            },

            new()
            {
                Id = 7,
                Name = "Dikmen",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8400,
                    39.8800,
                    32.8550,
                    39.8950)
            },

            new()
            {
                Id = 8,
                Name = "Öveçler",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8200,
                    39.8800,
                    32.8350,
                    39.8950)
            },

            new()
            {
                Id = 9,
                Name = "Balgat",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.7900,
                    39.8950,
                    32.8200,
                    39.9200)
            },

            new()
            {
                Id = 10,
                Name = "Oran",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8500,
                    39.8500,
                    32.8750,
                    39.8750)
            },

            new()
            {
                Id = 11,
                Name = "Çayyolu",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.7000,
                    39.8600,
                    32.7500,
                    39.9000)
            },

            new()
            {
                Id = 12,
                Name = "Kırkkonaklar",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8800,
                    39.8700,
                    32.9000,
                    39.8900)
            },

            new()
            {
                Id = 13,
                Name = "Ahlatlıbel",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.7800,
                    39.8000,
                    32.8200,
                    39.8350)
            },

            new()
            {
                Id = 14,
                Name = "İmrahor",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8500,
                    39.8000,
                    32.9000,
                    39.8400)
            },

            new()
            {
                Id = 15,
                Name = "Diğer/Kırsal",

                // Geçici mock bölge sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.7200,
                    39.7800,
                    32.7800,
                    39.8300)
            }
        };

        // Gerçek statik trafik verileri gelene kadar geçici bölge verileri
        _regionSummaries = new Dictionary<int, RegionSummaryData>
        {
            [1] = new()
            {
                TrafficLevel = "Yüksek"
            },

            [2] = new()
            {
                TrafficLevel = "Yüksek"
            },

            [3] = new()
            {
                TrafficLevel = "Orta"
            },

            [4] = new()
            {
                TrafficLevel = "Yüksek"
            },

            [5] = new()
            {
                TrafficLevel = "Yüksek"
            },

            [6] = new()
            {
                TrafficLevel = "Orta"
            },

            [7] = new()
            {
                TrafficLevel = "Orta"
            },

            [8] = new()
            {
                TrafficLevel = "Orta"
            },

            [9] = new()
            {
                TrafficLevel = "Yüksek"
            },

            [10] = new()
            {
                TrafficLevel = "Orta"
            },

            [11] = new()
            {
                TrafficLevel = "Orta"
            },

            [12] = new()
            {
                TrafficLevel = "Orta"
            },

            [13] = new()
            {
                TrafficLevel = "Düşük"
            },

            [14] = new()
            {
                TrafficLevel = "Düşük"
            },

            [15] = new()
            {
                TrafficLevel = "Düşük"
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
        // Gerçek GIS sınır verileri gelene kadar
        // geçici dikdörtgen mock geometri oluşturur
        var coordinates = new[]
        {
            new Coordinate(
                minLongitude,
                minLatitude),

            new Coordinate(
                maxLongitude,
                minLatitude),

            new Coordinate(
                maxLongitude,
                maxLatitude),

            new Coordinate(
                minLongitude,
                maxLatitude),

            // Polygon kapanması için ilk koordinat tekrar eklenir
            new Coordinate(
                minLongitude,
                minLatitude)
        };

        // Polygon dış sınırını oluşturur
        var shell = geometryFactory.CreateLinearRing(
            coordinates);

        // Geçici mock polygon verisini döndürür
        return geometryFactory.CreatePolygon(shell);
    }
}