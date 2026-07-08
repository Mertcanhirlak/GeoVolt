using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

// Mahalle verileriyle ilgili veri erişim işlemlerini gerçekleştirir
namespace GeoVolt.Infrastructure.Neighborhoods;

public sealed class NeighborhoodRepository : INeighborhoodRepository
{
    private readonly IReadOnlyList<Neighborhood> _neighborhoods;

    public NeighborhoodRepository()
    {
        // WGS84 koordinat sistemi için geometry factory oluşturur
        var geometryFactory = new GeometryFactory(
            new PrecisionModel(),
            4326);

        // Gerçek PostGIS verileri gelene kadar geçici mahalle verileri
        // Şimdilik Balgat bölgesine ait mahalleler eklenmiştir
        _neighborhoods = new List<Neighborhood>
        {
            new()
            {
                Id = 1,
                Name = "Balgat",
                RegionId = 9,

                // Geçici mock mahalle sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8200,
                    39.9040,
                    32.8380,
                    39.9180)
            },

            new()
            {
                Id = 2,
                Name = "Çukurambar",
                RegionId = 9,

                // Geçici mock mahalle sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8000,
                    39.9040,
                    32.8140,
                    39.9150)
            },

            new()
            {
                Id = 3,
                Name = "Söğütözü",
                RegionId = 9,

                // Geçici mock mahalle sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.7900,
                    39.9160,
                    32.8040,
                    39.9280)
            },

            new()
            {
                Id = 4,
                Name = "Ehlibeyt",
                RegionId = 9,

                // Geçici mock mahalle sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8140,
                    39.8920,
                    32.8260,
                    39.9040)
            },

            new()
            {
                Id = 5,
                Name = "Kızılırmak",
                RegionId = 9,

                // Geçici mock mahalle sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.8080,
                    39.9150,
                    32.8220,
                    39.9280)
            },

            new()
            {
                Id = 6,
                Name = "Mustafa Kemal",
                RegionId = 9,

                // Geçici mock mahalle sınırı
                Boundary = CreateMockRectangle(
                    geometryFactory,
                    32.7800,
                    39.9000,
                    32.7950,
                    39.9150)
            }
        };
    }

    public Task<IReadOnlyList<Neighborhood>> GetByRegionIdAsync(
        int regionId,
        CancellationToken cancellationToken = default)
    {
        // Belirtilen bölgeye bağlı mahalleleri filtreler
        IReadOnlyList<Neighborhood> neighborhoods = _neighborhoods
            .Where(neighborhood =>
                neighborhood.RegionId == regionId)
            .ToList();

        return Task.FromResult(neighborhoods);
    }

    public Task<Neighborhood?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre mahalleyi bulur
        var neighborhood = _neighborhoods.FirstOrDefault(
            neighborhood => neighborhood.Id == id);

        return Task.FromResult(neighborhood);
    }

    private static Polygon CreateMockRectangle(
        GeometryFactory geometryFactory,
        double minLongitude,
        double minLatitude,
        double maxLongitude,
        double maxLatitude)
    {
        // Gerçek GIS sınırları gelene kadar
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