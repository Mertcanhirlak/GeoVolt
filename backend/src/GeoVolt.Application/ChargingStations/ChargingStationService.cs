using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.ChargingStations.Dtos;
using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Domain.Entities;

//şarj istasyonları ile ilgili iş mantığı işlemlerini gerçekleştirir
namespace GeoVolt.Application.ChargingStations;

public sealed class ChargingStationService : IChargingStationService
{
    private readonly IChargingStationRepository _chargingStationRepository;

    public ChargingStationService(
        IChargingStationRepository chargingStationRepository)
    {
        _chargingStationRepository = chargingStationRepository;
    }

    public async Task<IReadOnlyList<ChargingStationResponseDto>> GetAllAsync(
    int? regionSourceId = null,
    int? neighborhoodSourceId = null,
    CancellationToken cancellationToken = default)
    {
        // Tüm istasyonları veya bölge ve mahalleye göre filtrelenmiş
        // istasyonları getirir
        var stations = await _chargingStationRepository.GetAllAsync(
            regionSourceId,
            neighborhoodSourceId,
            cancellationToken);

        // Entity listesini DTO listesine dönüştürür
        return stations
            .Select(MapToResponseDto)
            .ToList();
    }
    public async Task<ChargingStationDetailResponseDto> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // Id değerine göre istasyonu getirir
        var station = await _chargingStationRepository.GetByIdAsync(
            id,
            cancellationToken);

        // İstasyon bulunamazsa null döner
        if (station is null)
        {
            throw new NotFoundException("Şarj istasyonu bulunamadı.");
        }

        var connectors = station.Connectors
            .OrderBy(connector => connector.SocketType)
            .ThenByDescending(connector => connector.PowerKw)
            .ThenBy(connector => connector.SourceSocketNumber)
            .ToList();

        // İstasyon ve bağlantı bilgilerini detay DTO'suna dönüştürür
        return new ChargingStationDetailResponseDto
        {
            Id = station.Id,
            SourceStationNumber = station.SourceStationNumber,
            Name = station.Name,
            OperatorName = station.OperatorName,
            BrandName = station.BrandName,
            AccessType = station.AccessType,
            RegionId = station.Region.SourceId,
            RegionName = station.Region.Name,
            NeighborhoodId = station.Neighborhood.SourceId,
            NeighborhoodName = station.Neighborhood.Name,
            Address = station.Address,

            // Point.Y enlem bilgisidir
            Latitude = station.Location.Y,

            // Point.X boylam bilgisidir
            Longitude = station.Location.X,

            IsActive = station.IsActive,
            IsGreenStation = station.IsGreenStation,
            SocketCount = connectors.Sum(connector => connector.Quantity),
            MaxPowerKw = connectors.Count == 0
                ? null
                : connectors.Max(connector => connector.PowerKw),

            // Connector listesini response DTO'ya dönüştürür
            Connectors = connectors
                .Select(connector => new ChargingConnectorResponseDto
                {
                    Id = connector.Id,
                    SourceSocketNumber = connector.SourceSocketNumber,
                    SocketType = connector.SocketType,
                    ConnectorType = connector.ConnectorType,
                    PowerKw = connector.PowerKw,
                    Quantity = connector.Quantity
                })
                .ToList()
        };
    }

    private static ChargingStationResponseDto MapToResponseDto(
        ChargingStation station)
    {
        var connectors = station.Connectors.ToList();

        // İstasyon entity'sini response DTO'ya dönüştürür
        return new ChargingStationResponseDto
        {
            Id = station.Id,
            SourceStationNumber = station.SourceStationNumber,
            Name = station.Name,
            OperatorName = station.OperatorName,
            BrandName = station.BrandName,
            AccessType = station.AccessType,
            RegionId = station.Region.SourceId,
            RegionName = station.Region.Name,
            NeighborhoodId = station.Neighborhood.SourceId,
            NeighborhoodName = station.Neighborhood.Name,
            Address = station.Address,

            // Point.Y enlem bilgisidir
            Latitude = station.Location.Y,

            // Point.X boylam bilgisidir
            Longitude = station.Location.X,

            IsActive = station.IsActive,
            IsGreenStation = station.IsGreenStation,
            SocketCount = connectors.Sum(connector => connector.Quantity),
            MaxPowerKw = connectors.Count == 0
                ? null
                : connectors.Max(connector => connector.PowerKw),
            SocketTypes = connectors
                .Select(connector => connector.SocketType)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(socketType => socketType)
                .ToList(),
            ConnectorTypes = connectors
                .Where(connector => !string.IsNullOrWhiteSpace(connector.ConnectorType))
                .Select(connector => connector.ConnectorType!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(connectorType => connectorType)
                .ToList()
        };
    }
}
