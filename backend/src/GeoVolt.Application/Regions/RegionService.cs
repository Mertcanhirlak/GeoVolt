using System.Text.Json;
using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

namespace GeoVolt.Application.Regions;

// Bölge ve istasyon verilerini yönetir.
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
        // Tüm bölgeleri getirir.
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
        // Kaynak kimliğine göre bölgeyi getirir.
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
        // Kaynak kimliğine göre bölgeyi getirir.
        var region = await _regionRepository.GetBySourceIdAsync(
            sourceId,
            cancellationToken);

        if (region is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

     

        // Mahalle filtresi uygulamadan bölgedeki istasyonları getirir.
        var stations =
            await _chargingStationRepository.GetAllAsync(
                regionSourceId: sourceId,
                neighborhoodSourceId: null,
                cancellationToken: cancellationToken);

        // Her istasyona ait connectorları getirir.
        var connectorTasks = stations.Select(
            station =>
                _chargingStationRepository
                    .GetConnectorsByStationIdAsync(
                        station.Id,
                        cancellationToken));

        var connectorLists = await Task.WhenAll(
            connectorTasks);

        var connectors = connectorLists
            .SelectMany(list => list)
            .ToList();

        var companyDistribution = stations
            .GroupBy(station => station.OperatorName)
            .Select(group => new CompanyDistributionResponseDto
            {
                CompanyName = group.Key,
                StationCount = group.Count()
            })
            .OrderByDescending(item => item.StationCount)
            .ThenBy(item => item.CompanyName)
            .ToList();

        // Connector adedine göre en yaygın soket türünü bulur.
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

        // Connector adedine göre en yaygın gücü bulur.
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
            ChargingStationCount = stations.Count,

            
            // Gerçek trafik verisi henüz sisteme bağlı değildir.
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
        // Kaynak kimliğine göre seçilen bölgeyi getirir.
        var region = await _regionRepository.GetBySourceIdAsync(
            regionSourceId,
            cancellationToken);

        if (region is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

        // X = Longitude, Y = Latitude
        var point = region.Boundary.Factory.CreatePoint(
            new Coordinate(
                request.Longitude,
                request.Latitude));

        var isInsideRegion = region.Boundary.Covers(point);

        if (!isInsideRegion)
        {
            return new LocateRegionPointResponseDto
            {
                RegionId = region.SourceId,
                RegionName = region.Name,
                IsInsideRegion = false,
                NeighborhoodId = null,
                NeighborhoodName = null,
                Latitude = request.Latitude,
                Longitude = request.Longitude
            };
        }

        // Kaynak bölge kimliğine bağlı mahalleleri getirir.
        var neighborhoods =
           await _neighborhoodRepository.GetByRegionSourceIdAsync(
    regionSourceId,
    cancellationToken);

        var neighborhood = neighborhoods.FirstOrDefault(
            item => item.Boundary.Covers(point));

        return new LocateRegionPointResponseDto
        {
            RegionId = region.SourceId,
            RegionName = region.Name,
            IsInsideRegion = true,
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