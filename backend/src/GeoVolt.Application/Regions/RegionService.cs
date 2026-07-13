using System.Text.Json;
using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;
using GeoVolt.Application.Neighborhoods.Abstractions;

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
        // Id değerine göre bölgeyi getirir
        var region = await _regionRepository.GetByIdAsync(
            id,
            cancellationToken);

        // Bölge bulunamazsa null döner
        if (region is null)
        {
            return null;
        }

        // Bölgenin statik özet verisini getirir
        var summary = await _regionRepository.GetSummaryAsync(
            id,
            cancellationToken);

        // Seçilen bölgedeki tüm istasyonları getirir
        // Mahalle filtresi uygulanmaz
        var stations = await _chargingStationRepository.GetAllAsync(
            regionId: id,
            neighborhoodId: null,
            cancellationToken: cancellationToken);

        // Her istasyona ait connector verilerini getirir
        var connectorTasks = stations
            .Select(station =>
                _chargingStationRepository
                    .GetConnectorsByStationIdAsync(
                        station.Id,
                        cancellationToken));

        var connectorLists = await Task.WhenAll(
            connectorTasks);

        // Connector listelerini tek listede birleştirir
        var connectors = connectorLists
            .SelectMany(list => list)
            .ToList();

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

            // İstasyon repository'sindeki gerçek mock sayıyı kullanır
            ChargingStationCount = stations.Count,

            // Şimdilik statik bölge verisinden alınır
            TrafficLevel = summary?.TrafficLevel
                ?? "Veri bulunamadı",

            // Connector verilerinden hesaplanır
            MostCommonSocketType = mostCommonSocketType,

            // Connector verilerinden hesaplanır
            MostCommonPowerKw = mostCommonPowerKw,

            // İstasyon verilerinden hesaplanır
            CompanyDistribution = companyDistribution
        };
    }

    
    public async Task<LocateRegionPointResponseDto?> LocatePointAsync(
    int regionId,
    RegionPointRequestDto request,
    CancellationToken cancellationToken = default)
    {
        // Id değerine göre seçilen bölgeyi getirir
        var region = await _regionRepository.GetByIdAsync(
            regionId,
            cancellationToken);

        // Bölge bulunamazsa null döner
        if (region is null)
        {
            return null;
        }

        // Enlem ve boylam bilgisinden Point oluşturur
        var point = region.Boundary.Factory.CreatePoint(
            new Coordinate(
                request.Longitude,
                request.Latitude));

        // Noktanın seçilen bölge içinde veya sınır üzerinde
        // olup olmadığını kontrol eder
        var isInsideRegion = region.Boundary.Covers(
            point);

        // Nokta bölge dışındaysa mahalle araması yapmadan döner
        if (!isInsideRegion)
        {
            return new LocateRegionPointResponseDto
            {
                RegionId = region.Id,
                RegionName = region.Name,
                IsInsideRegion = false,
                NeighborhoodId = null,
                NeighborhoodName = null,
                Latitude = request.Latitude,
                Longitude = request.Longitude
            };
        }

        // Seçilen bölgeye bağlı mahalleleri getirir
        var neighborhoods = await _neighborhoodRepository.GetByRegionIdAsync(
            regionId,
            cancellationToken);

        // Noktanın hangi mahalle sınırı içinde olduğunu bulur
        var neighborhood = neighborhoods.FirstOrDefault(
            item => item.Boundary.Covers(point));

        // Bölge ve varsa mahalle bilgisini döndürür
        return new LocateRegionPointResponseDto
        {
            RegionId = region.Id,
            RegionName = region.Name,
            IsInsideRegion = true,
            NeighborhoodId = neighborhood?.Id,
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
