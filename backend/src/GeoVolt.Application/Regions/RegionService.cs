using System.Text.Json;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

namespace GeoVolt.Application.Regions;

public sealed class RegionService : IRegionService
{
    private readonly IRegionRepository _regionRepository;

    public RegionService(IRegionRepository regionRepository)
    {
        _regionRepository = regionRepository;
    }

    public async Task<IReadOnlyList<RegionResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        // Tüm bölgeleri repository üzerinden alır
        var regions = await _regionRepository.GetAllAsync(
            cancellationToken);

        // Entity listesini DTO listesine dönüştürür
        return regions
            .Select(MapToResponseDto)
            .ToList();
    }

    public async Task<RegionResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre bölgeyi getirir
        var region = await _regionRepository.GetByIdAsync(
            id,
            cancellationToken);

        // Bölge bulunamazsa null döner
        if (region is null)
        {
            return null;
        }

        // Entity nesnesini DTO'ya dönüştürür
        return MapToResponseDto(region);
    }

    public async Task<RegionSummaryResponseDto?> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // Bölge bilgisini getirir
        var region = await _regionRepository.GetByIdAsync(
            id,
            cancellationToken);

        // Bölge bulunamazsa null döner
        if (region is null)
        {
            return null;
        }

        // Bölgenin özet verilerini repository üzerinden alır
        var summary = await _regionRepository.GetSummaryAsync(
            id,
            cancellationToken);

        // Özet veri bulunamazsa null döner
        if (summary is null)
        {
            return null;
        }

        // Repository verisini response DTO'ya dönüştürür
        return new RegionSummaryResponseDto
        {
            RegionId = region.Id,
            RegionName = region.Name,

            // Bölgedeki toplam istasyon sayısı
            ChargingStationCount = summary.ChargingStationCount,

            // Bölgenin trafik yoğunluğu
            TrafficLevel = summary.TrafficLevel,

            // En yaygın soket tipi
            MostCommonSocketType = summary.MostCommonSocketType,

            // En yaygın güç kapasitesi
            MostCommonPowerKw = summary.MostCommonPowerKw,

            // Firma dağılımını response modeline dönüştürür
            CompanyDistribution = summary.CompanyDistribution
                .Select(company => new CompanyDistributionResponseDto
                {
                    CompanyName = company.CompanyName,
                    StationCount = company.StationCount
                })
                .ToList()
        };
    }

    private static RegionResponseDto MapToResponseDto(
        Region region)
    {
        // Region entity'sini response DTO'ya dönüştürür
        return new RegionResponseDto
        {
            Id = region.Id,
            Name = region.Name,
            BoundaryGeoJson = ToGeoJson(region.Boundary)
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
                coordinates = GetPolygonCoordinates(polygon)
            });
        }

        // MultiPolygon geometrisini GeoJSON'a çevirir
        if (geometry is MultiPolygon multiPolygon)
        {
            var coordinates = Enumerable
                .Range(0, multiPolygon.NumGeometries)
                .Select(index =>
                    GetPolygonCoordinates(
                        (Polygon)multiPolygon.GetGeometryN(index)))
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