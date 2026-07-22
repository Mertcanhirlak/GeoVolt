using System.Text.Json;
using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

// Bölge ve istasyon verilerini yönetmek için servis sınıfı
namespace GeoVolt.Application.Regions;

public sealed class RegionService : IRegionService
{
    private readonly IRegionRepository _regionRepository;
    private readonly IChargingStationRepository _chargingStationRepository;
    private readonly INeighborhoodRepository _neighborhoodRepository;

    public RegionService(
        IRegionRepository regionRepository,
        IChargingStationRepository chargingStationRepository,
        INeighborhoodRepository neighborhoodRepository)
    {
        _regionRepository = regionRepository;
        _chargingStationRepository = chargingStationRepository;
        _neighborhoodRepository = neighborhoodRepository;
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

    public async Task<RegionResponseDto> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre bölgeyi getirir
        var region = await _regionRepository.GetBySourceIdAsync(
            sourceId,
            cancellationToken);

        // Bölge bulunamazsa null döner
        if (region is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

        // Entity nesnesini DTO'ya dönüştürür
        return MapToResponseDto(region);
    }

    public async Task<RegionSummaryResponseDto> GetSummaryBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre bölgeyi getirir
        var region = await _regionRepository.GetBySourceIdAsync(
            sourceId,
            cancellationToken);

        // Bölge bulunamazsa null döner
        if (region is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

        // Seçilen bölgedeki tüm istasyonları getirir
        // Mahalle filtresi uygulanmaz
        var stations = await _chargingStationRepository.GetAllAsync(
            regionSourceId: sourceId,
            neighborhoodSourceId: null,
            cancellationToken: cancellationToken);

        var allStations = await _chargingStationRepository.GetAllAsync(
            regionSourceId: null,
            neighborhoodSourceId: null,
            cancellationToken: cancellationToken);

        // Repository connector verilerini istasyonlarla birlikte topluca getirir.
        var connectors = stations
            .SelectMany(station => station.Connectors)
            .ToList();

        var chargingStationCount = stations.Count;
        var totalChargingStationCount = allStations.Count;
        var chargingStationPercentage =
            totalChargingStationCount == 0
                ? 0
                : Math.Round(
                    chargingStationCount * 100.0 / totalChargingStationCount,
                    2,
                    MidpointRounding.AwayFromZero);

        var acCount = connectors
            .Where(connector => string.Equals(
                connector.SocketType.Trim(),
                "AC",
                StringComparison.OrdinalIgnoreCase))
            .Sum(connector => connector.Quantity);

        var dcCount = connectors
            .Where(connector => string.Equals(
                connector.SocketType.Trim(),
                "DC",
                StringComparison.OrdinalIgnoreCase))
            .Sum(connector => connector.Quantity);

        var totalAcDcCount = acCount + dcCount;
        var acPercentage = totalAcDcCount == 0
            ? 0
            : Math.Round(
                acCount * 100.0 / totalAcDcCount,
                2,
                MidpointRounding.AwayFromZero);
        var dcPercentage = totalAcDcCount == 0
            ? 0
            : Math.Round(
                dcCount * 100.0 / totalAcDcCount,
                2,
                MidpointRounding.AwayFromZero);

        // Firmalara göre istasyon dağılımını hesaplar
        var companyDistribution = stations
            .GroupBy(station => station.OperatorName)
            .Select(group => new CompanyDistributionResponseDto
            {
                CompanyName = group.Key,
                StationCount = group.Count()
            })
            .OrderByDescending(company => company.StationCount)
            .ThenBy(company => company.CompanyName)
            .ToList();

        // En yaygın soket tipini hesaplar
        var mostCommonSocketType = connectors
            .GroupBy(connector => connector.SocketType)
            .Select(group => new
            {
                SocketType = group.Key,

                // Connector adetlerini dikkate alır
                TotalQuantity = group.Sum(
                    connector => connector.Quantity)
            })
            .OrderByDescending(item => item.TotalQuantity)
            .ThenBy(item => item.SocketType)
            .Select(item => item.SocketType)
            .FirstOrDefault();

        // En yaygın güç kapasitesini hesaplar
        var mostCommonPowerKw = connectors
            .GroupBy(connector => connector.PowerKw)
            .Select(group => new
            {
                PowerKw = group.Key,

                // Connector adetlerini dikkate alır
                TotalQuantity = group.Sum(
                    connector => connector.Quantity)
            })
            .OrderByDescending(item => item.TotalQuantity)
            .ThenByDescending(item => item.PowerKw)
            .Select(item => (double?)item.PowerKw)
            .FirstOrDefault();

        // Hesaplanan verileri response DTO'ya dönüştürür
        return new RegionSummaryResponseDto
        {
            RegionId = region.SourceId,
            RegionName = region.Name,

            // PostGIS repository'sindeki gerçek istasyon sayısını kullanır
            ChargingStationCount = chargingStationCount,
            TotalChargingStationCount = totalChargingStationCount,
            ChargingStationPercentage = chargingStationPercentage,
            AcCount = acCount,
            DcCount = dcCount,
            AcPercentage = acPercentage,
            DcPercentage = dcPercentage,

            // Gerçek trafik veri seti henüz sisteme bağlı değildir.
            TrafficLevel = "Veri hazırlanıyor",

            // Connector verilerinden hesaplanır
            MostCommonSocketType = mostCommonSocketType,

            // Connector verilerinden hesaplanır
            MostCommonPowerKw = mostCommonPowerKw,

            // İstasyon verilerinden hesaplanır
            CompanyDistribution = companyDistribution
        };
    }

    public async Task<LocateRegionPointResponseDto> LocatePointAsync(
        int regionSourceId,
        RegionPointRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var region = await _regionRepository.GetBySourceIdAsync(
            regionSourceId,
            cancellationToken);

        if (region is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

        var point = region.Boundary.Factory.CreatePoint(
            new Coordinate(request.Longitude, request.Latitude));
        var isInsideRegion = region.Boundary.Covers(point);

        Neighborhood? neighborhood = null;

        if (isInsideRegion)
        {
            var neighborhoods =
                await _neighborhoodRepository.GetByRegionSourceIdAsync(
                    regionSourceId,
                    cancellationToken);

            neighborhood = neighborhoods.FirstOrDefault(
                item => item.Boundary.Covers(point));
        }

        return new LocateRegionPointResponseDto
        {
            RegionId = region.SourceId,
            RegionName = region.Name,
            IsInsideRegion = isInsideRegion,
            NeighborhoodId = neighborhood?.SourceId,
            NeighborhoodName = neighborhood?.Name,
            Latitude = request.Latitude,
            Longitude = request.Longitude
        };
    }

    private static RegionResponseDto MapToResponseDto(
        Region region)
    {
        // Region entity'sini response DTO'ya dönüştürür
        return new RegionResponseDto
        {
            Id = region.SourceId,
            Name = region.Name,
            Population = region.Population,
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
