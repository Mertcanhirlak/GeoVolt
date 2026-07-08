using System.Text.Json;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.Neighborhoods.Dtos;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

//mahalle verilerini yönetmek için servis sınıfı
namespace GeoVolt.Application.Neighborhoods;

public sealed class NeighborhoodService : INeighborhoodService
{
    private readonly INeighborhoodRepository _neighborhoodRepository;

    public NeighborhoodService(
        INeighborhoodRepository neighborhoodRepository)
    {
        _neighborhoodRepository = neighborhoodRepository;
    }

    public async Task<IReadOnlyList<NeighborhoodResponseDto>> GetByRegionIdAsync(
        int regionId,
        CancellationToken cancellationToken = default)
    {
        // Belirtilen bölgeye bağlı mahalleleri getirir
        var neighborhoods =
            await _neighborhoodRepository.GetByRegionIdAsync(
                regionId,
                cancellationToken);

        // Entity listesini DTO listesine dönüştürür
        return neighborhoods
            .Select(MapToResponseDto)
            .ToList();
    }

    public async Task<NeighborhoodDetailResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre mahalleyi getirir
        var neighborhood =
            await _neighborhoodRepository.GetByIdAsync(
                id,
                cancellationToken);

        // Mahalle bulunamazsa null döner
        if (neighborhood is null)
        {
            return null;
        }

        // Entity nesnesini detay DTO'suna dönüştürür
        return new NeighborhoodDetailResponseDto
        {
            Id = neighborhood.Id,
            Name = neighborhood.Name,
            RegionId = neighborhood.RegionId,
            BoundaryGeoJson = ToGeoJson(
                neighborhood.Boundary)
        };
    }

    private static NeighborhoodResponseDto MapToResponseDto(
        Neighborhood neighborhood)
    {
        // Mahalle entity'sini liste DTO'suna dönüştürür
        return new NeighborhoodResponseDto
        {
            Id = neighborhood.Id,
            Name = neighborhood.Name,
            RegionId = neighborhood.RegionId
        };
    }

    private static string ToGeoJson(
        Geometry geometry)
    {
        // Polygon geometrisini GeoJSON'a çevirir
        if (geometry is Polygon polygon)
        {
            return JsonSerializer.Serialize(new
            {
                type = "Polygon",
                coordinates = GetPolygonCoordinates(
                    polygon)
            });
        }

        // MultiPolygon geometrisini GeoJSON'a çevirir
        if (geometry is MultiPolygon multiPolygon)
        {
            var coordinates = Enumerable
                .Range(
                    0,
                    multiPolygon.NumGeometries)
                .Select(index =>
                    GetPolygonCoordinates(
                        (Polygon)multiPolygon.GetGeometryN(
                            index)))
                .ToArray();

            return JsonSerializer.Serialize(new
            {
                type = "MultiPolygon",
                coordinates
            });
        }

        // Desteklenmeyen geometri tipinde hata verir
        throw new NotSupportedException(
            $"Desteklenmeyen geometri tipi: {geometry.GeometryType}");
    }

    private static double[][][] GetPolygonCoordinates(
        Polygon polygon)
    {
        var rings = new List<double[][]>();

        // Polygon dış sınırını ekler
        rings.Add(
            GetRingCoordinates(
                polygon.ExteriorRing));

        // Varsa iç boşlukları ekler
        for (var i = 0; i < polygon.NumInteriorRings; i++)
        {
            rings.Add(
                GetRingCoordinates(
                    polygon.GetInteriorRingN(i)));
        }

        return rings.ToArray();
    }

    private static double[][] GetRingCoordinates(
        LineString ring)
    {
        // Koordinatları [longitude, latitude] formatına çevirir
        return ring.Coordinates
            .Select(coordinate => new[]
            {
                coordinate.X,
                coordinate.Y
            })
            .ToArray();
    }
}