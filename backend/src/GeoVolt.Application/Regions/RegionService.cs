using System.Text.Json;
using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

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
        var regions = await _regionRepository.GetAllAsync(
            cancellationToken);

        return regions
            .Select(MapToResponseDto)
            .ToList();
    }

    public async Task<RegionResponseDto> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default)
    {
        var region = await _regionRepository.GetBySourceIdAsync(
            sourceId,
            cancellationToken);

        if (region is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

        return MapToResponseDto(region);
    }

    public async Task<RegionSummaryResponseDto> GetSummaryBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default)
    {
        var region = await _regionRepository.GetBySourceIdAsync(
            sourceId,
            cancellationToken);

        if (region is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

        // Seçilen semtteki istasyonları getirir
        var stations = await _chargingStationRepository.GetAllAsync(
            regionSourceId: sourceId,
            neighborhoodSourceId: null,
            cancellationToken: cancellationToken);

        // Sistemdeki tüm istasyonları getirir
        var allStations = await _chargingStationRepository.GetAllAsync(
            regionSourceId: null,
            neighborhoodSourceId: null,
            cancellationToken: cancellationToken);

        var connectors = stations
            .SelectMany(station => station.Connectors)
            .ToList();

        var chargingStationCount = stations.Count;
        var totalChargingStationCount = allStations.Count;

        // Seçilen semtin toplam istasyonlar içindeki payını hesaplar
        var chargingStationPercentage =
            totalChargingStationCount == 0
                ? 0
                : Math.Round(
                    chargingStationCount * 100.0 /
                    totalChargingStationCount,
                    2,
                    MidpointRounding.AwayFromZero);

        // AC soketlerin toplam adedini hesaplar
        var acCount = connectors
            .Where(connector =>
                string.Equals(
                    connector.SocketType.Trim(),
                    "AC",
                    StringComparison.OrdinalIgnoreCase))
            .Sum(connector => connector.Quantity);

        // DC soketlerin toplam adedini hesaplar
        var dcCount = connectors
            .Where(connector =>
                string.Equals(
                    connector.SocketType.Trim(),
                    "DC",
                    StringComparison.OrdinalIgnoreCase))
            .Sum(connector => connector.Quantity);

        var totalAcDcCount = acCount + dcCount;

        // Semtteki AC soket oranını hesaplar
        var acPercentage =
            totalAcDcCount == 0
                ? 0
                : Math.Round(
                    acCount * 100.0 / totalAcDcCount,
                    2,
                    MidpointRounding.AwayFromZero);

        // Semtteki DC soket oranını hesaplar
        var dcPercentage =
            totalAcDcCount == 0
                ? 0
                : Math.Round(
                    dcCount * 100.0 / totalAcDcCount,
                    2,
                    MidpointRounding.AwayFromZero);

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

        var mostCommonSocketType = connectors
            .GroupBy(connector => connector.SocketType)
            .Select(group => new
            {
                SocketType = group.Key,
                TotalQuantity = group.Sum(
                    connector => connector.Quantity)
            })
            .OrderByDescending(item => item.TotalQuantity)
            .ThenBy(item => item.SocketType)
            .Select(item => item.SocketType)
            .FirstOrDefault();

        var mostCommonPowerKw = connectors
            .GroupBy(connector => connector.PowerKw)
            .Select(group => new
            {
                PowerKw = group.Key,
                TotalQuantity = group.Sum(
                    connector => connector.Quantity)
            })
            .OrderByDescending(item => item.TotalQuantity)
            .ThenByDescending(item => item.PowerKw)
            .Select(item => (double?)item.PowerKw)
            .FirstOrDefault();

        return new RegionSummaryResponseDto
        {
            RegionId = region.SourceId,
            RegionName = region.Name,

            ChargingStationCount = chargingStationCount,
            TotalChargingStationCount = totalChargingStationCount,
            ChargingStationPercentage = chargingStationPercentage,

            AcCount = acCount,
            DcCount = dcCount,
            AcPercentage = acPercentage,
            DcPercentage = dcPercentage,

            TrafficLevel = "Veri hazırlanıyor",
            MostCommonSocketType = mostCommonSocketType,
            MostCommonPowerKw = mostCommonPowerKw,
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
            new Coordinate(
                request.Longitude,
                request.Latitude));

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
        if (geometry is Polygon polygon)
        {
            return JsonSerializer.Serialize(new
            {
                type = "Polygon",
                coordinates = GetPolygonCoordinates(polygon)
            });
        }

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

        throw new NotSupportedException(
            $"Desteklenmeyen geometri tipi: {geometry.GeometryType}");
    }

    private static double[][][] GetPolygonCoordinates(
        Polygon polygon)
    {
        var rings = new List<double[][]>
        {
            GetRingCoordinates(polygon.ExteriorRing)
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
        return ring.Coordinates
            .Select(coordinate => new[]
            {
                coordinate.X,
                coordinate.Y
            })
            .ToArray();
    }
}