using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

// Şarj istasyonları ve bağlantı noktaları ile ilgili
// veri erişim işlemlerini gerçekleştiren repository sınıfı
namespace GeoVolt.Infrastructure.ChargingStations;

public sealed class ChargingStationRepository : IChargingStationRepository
{
    private readonly IReadOnlyList<ChargingStation> _stations;

    private readonly IReadOnlyList<ChargingConnector> _connectors;

    public ChargingStationRepository()
    {
        // WGS84 koordinat sistemi için geometry factory oluşturur
        var geometryFactory = new GeometryFactory(
            new PrecisionModel(),
            4326);

        // Gerçek PostGIS verileri gelene kadar geçici istasyon verileri
        _stations = new List<ChargingStation>
        {
            new()
            {
                Id = 1,
                Name = "Çukurambar Şarj Noktası 1",
                OperatorName = "ZES",

                // Çukurambar, Balgat bölgesine bağlıdır
                RegionId = 9,

                // Çukurambar mahallesi
                NeighborhoodId = 2,

                Address = "Çukurambar, Çankaya / Ankara",

                // Geçici mock konum
                Location = CreatePoint(
                    geometryFactory,
                    32.8040,
                    39.9080),

                IsActive = true
            },

            new()
            {
                Id = 2,
                Name = "Çukurambar Şarj Noktası 2",
                OperatorName = "Trugo",

                // Çukurambar, Balgat bölgesine bağlıdır
                RegionId = 9,

                // Çukurambar mahallesi
                NeighborhoodId = 2,

                Address = "Çukurambar, Çankaya / Ankara",

                // Geçici mock konum
                Location = CreatePoint(
                    geometryFactory,
                    32.8100,
                    39.9120),

                IsActive = true
            },

            new()
            {
                Id = 3,
                Name = "Balgat Şarj Noktası 1",
                OperatorName = "Eşarj",

                // Balgat mahallesi, Balgat bölgesine bağlıdır
                RegionId = 9,

                // Balgat mahallesi
                NeighborhoodId = 1,

                Address = "Balgat, Çankaya / Ankara",

                // Geçici mock konum
                Location = CreatePoint(
                    geometryFactory,
                    32.8240,
                    39.9080),

                IsActive = true
            },

            new()
            {
                Id = 4,
                Name = "Balgat Şarj Noktası 2",
                OperatorName = "ZES",

                // Balgat mahallesi, Balgat bölgesine bağlıdır
                RegionId = 9,

                // Balgat mahallesi
                NeighborhoodId = 1,

                Address = "Balgat, Çankaya / Ankara",

                // Geçici mock konum
                Location = CreatePoint(
                    geometryFactory,
                    32.8330,
                    39.9140),

                IsActive = false
            },

            new()
            {
                Id = 5,
                Name = "Söğütözü Şarj Noktası 1",
                OperatorName = "Trugo",

                // Söğütözü, Balgat bölgesine bağlıdır
                RegionId = 9,

                // Söğütözü mahallesi
                NeighborhoodId = 3,

                Address = "Söğütözü, Çankaya / Ankara",

                // Geçici mock konum
                Location = CreatePoint(
                    geometryFactory,
                    32.7940,
                    39.9180),

                IsActive = true
            },

            new()
            {
                Id = 6,
                Name = "Söğütözü Şarj Noktası 2",
                OperatorName = "Eşarj",

                // Söğütözü, Balgat bölgesine bağlıdır
                RegionId = 9,

                // Söğütözü mahallesi
                NeighborhoodId = 3,

                Address = "Söğütözü, Çankaya / Ankara",

                // Geçici mock konum
                Location = CreatePoint(
                    geometryFactory,
                    32.8000,
                    39.9240),

                IsActive = true
            }
        };

        // Gerçek veriler gelene kadar geçici connector verileri
        _connectors = new List<ChargingConnector>
        {
            new()
            {
                Id = 1,
                ChargingStationId = 1,
                SocketType = "CCS",
                PowerKw = 180,
                Quantity = 2
            },

            new()
            {
                Id = 2,
                ChargingStationId = 1,
                SocketType = "Type 2",
                PowerKw = 22,
                Quantity = 4
            },

            new()
            {
                Id = 3,
                ChargingStationId = 2,
                SocketType = "CCS",
                PowerKw = 120,
                Quantity = 2
            },

            new()
            {
                Id = 4,
                ChargingStationId = 3,
                SocketType = "Type 2",
                PowerKw = 22,
                Quantity = 3
            },

            new()
            {
                Id = 5,
                ChargingStationId = 4,
                SocketType = "CCS",
                PowerKw = 60,
                Quantity = 2
            },

            new()
            {
                Id = 6,
                ChargingStationId = 5,
                SocketType = "CCS",
                PowerKw = 180,
                Quantity = 4
            },

            new()
            {
                Id = 7,
                ChargingStationId = 5,
                SocketType = "Type 2",
                PowerKw = 22,
                Quantity = 2
            },

            new()
            {
                Id = 8,
                ChargingStationId = 6,
                SocketType = "CCS",
                PowerKw = 120,
                Quantity = 2
            }
        };
    }

    public Task<IReadOnlyList<ChargingStation>> GetAllAsync(
       int? regionId = null,
       int? neighborhoodId = null,
       CancellationToken cancellationToken = default)
    {
        // Filtreleme işlemleri için sorguyu tüm istasyonlarla başlatır
        IEnumerable<ChargingStation> query = _stations;

        // Bölge filtresi varsa uygular
        if (regionId.HasValue)
        {
            query = query.Where(station =>
                station.RegionId == regionId.Value);
        }

        // Mahalle filtresi varsa uygular
        if (neighborhoodId.HasValue)
        {
            query = query.Where(station =>
                station.NeighborhoodId == neighborhoodId.Value);
        }

        // Filtrelenmiş istasyon listesini döndürür
        IReadOnlyList<ChargingStation> stations = query.ToList();

        return Task.FromResult(stations);
    }

    public Task<ChargingStation?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre istasyonu bulur
        var station = _stations.FirstOrDefault(
            station => station.Id == id);

        return Task.FromResult(station);
    }

    public Task<IReadOnlyList<ChargingConnector>> GetConnectorsByStationIdAsync(
        int chargingStationId,
        CancellationToken cancellationToken = default)
    {
        // Belirtilen istasyona ait bağlantı noktalarını getirir
        IReadOnlyList<ChargingConnector> connectors = _connectors
            .Where(connector =>
                connector.ChargingStationId == chargingStationId)
            .ToList();

        return Task.FromResult(connectors);
    }

    private static Point CreatePoint(
        GeometryFactory geometryFactory,
        double longitude,
        double latitude)
    {
        // Harita üzerindeki geçici istasyon konumunu oluşturur
        return geometryFactory.CreatePoint(
            new Coordinate(
                longitude,
                latitude));
    }
}