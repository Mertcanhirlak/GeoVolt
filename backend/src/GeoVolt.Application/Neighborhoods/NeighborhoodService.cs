using System.Text.Json;
using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.Neighborhoods.Dtos;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

namespace GeoVolt.Application.Neighborhoods;

// Mahallelerle ilgili iş kurallarını yönetir.
public sealed class NeighborhoodService : INeighborhoodService
{
    private readonly INeighborhoodRepository _neighborhoodRepository;

    public NeighborhoodService(
        INeighborhoodRepository neighborhoodRepository)
    {
        _neighborhoodRepository = neighborhoodRepository;
    }

    public async Task<IReadOnlyList<NeighborhoodResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        // Tüm mahalleleri getirir.
        var neighborhoods =
            await _neighborhoodRepository.GetAllAsync(
                cancellationToken);

        return neighborhoods
            .Select(MapToResponseDto)
            .ToList();
    }

    public async Task<IReadOnlyList<NeighborhoodResponseDto>>
        GetByRegionSourceIdAsync(
            int regionSourceId,
            CancellationToken cancellationToken = default)
    {
        // Bölgenin kaynak kimliğine bağlı mahalleleri getirir.
        var neighborhoods =
            await _neighborhoodRepository.GetByRegionSourceIdAsync(
                regionSourceId,
                cancellationToken);

        return neighborhoods
            .Select(MapToResponseDto)
            .ToList();
    }

    public async Task<NeighborhoodDetailResponseDto> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default)
    {
        // Mahallenin kaynak kimliğine göre kaydı getirir.
        var neighborhood =
            await _neighborhoodRepository.GetBySourceIdAsync(
                sourceId,
                cancellationToken);

        if (neighborhood is null)
        {
            throw new NotFoundException(
                "Mahalle bulunamadı.");
        }

        return MapToDetailResponseDto(
            neighborhood);
    }

    private static NeighborhoodResponseDto MapToResponseDto(
        Neighborhood neighborhood)
    {
        return new NeighborhoodResponseDto
        {
            // API kaynak kimliklerini döndürür.
            Id = neighborhood.SourceId,
            Name = neighborhood.Name,
            RegionId = neighborhood.Region.SourceId,
            RegionName = neighborhood.Region.Name,
            Population = neighborhood.Population
        };
    }

    private static NeighborhoodDetailResponseDto MapToDetailResponseDto(
        Neighborhood neighborhood)
    {
        return new NeighborhoodDetailResponseDto
        {
            // API kaynak kimliklerini döndürür.
            Id = neighborhood.SourceId,
            Name = neighborhood.Name,
            RegionId = neighborhood.Region.SourceId,
            RegionName = neighborhood.Region.Name,
            Population = neighborhood.Population,
            BoundaryGeoJson = ToGeoJson(
                neighborhood.Boundary)
        };
    }

    private static string ToGeoJson(
        Geometry geometry)
    {
        if (geometry is Polygon polygon)
        {
            return JsonSerializer.Serialize(new
            {
                type = "Polygon",
                coordinates = GetPolygonCoordinates(
                    polygon)
            });
        }

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

        throw new NotSupportedException(
            $"Desteklenmeyen geometri tipi: {geometry.GeometryType}");
    }

    private static double[][][] GetPolygonCoordinates(
        Polygon polygon)
    {
        var rings = new List<double[][]>
        {
            GetRingCoordinates(
                polygon.ExteriorRing)
        };

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
        // GeoJSON koordinat sırası: longitude, latitude
        return ring.Coordinates
            .Select(coordinate => new[]
            {
                coordinate.X,
                coordinate.Y
            })
            .ToArray();
    }
}