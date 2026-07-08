using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.ChargingStations.Dtos;
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
    int? regionId = null,
    int? neighborhoodId = null,
    CancellationToken cancellationToken = default)
    {
        // Tüm istasyonları veya bölge ve mahalleye göre filtrelenmiş
        // istasyonları getirir
        var stations = await _chargingStationRepository.GetAllAsync(
            regionId,
            neighborhoodId,
            cancellationToken);

        // Entity listesini DTO listesine dönüştürür
        return stations
            .Select(MapToResponseDto)
            .ToList();
    }
    public async Task<ChargingStationDetailResponseDto?> GetByIdAsync(
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
            return null;
        }

        // İstasyona ait bağlantı noktalarını getirir
        var connectors =
            await _chargingStationRepository.GetConnectorsByStationIdAsync(
                station.Id,
                cancellationToken);

        // İstasyon ve bağlantı bilgilerini detay DTO'suna dönüştürür
        return new ChargingStationDetailResponseDto
        {
            Id = station.Id,
            Name = station.Name,
            OperatorName = station.OperatorName,
            RegionId = station.RegionId,
            NeighborhoodId = station.NeighborhoodId,
            Address = station.Address,

            // Point.Y enlem bilgisidir
            Latitude = station.Location.Y,

            // Point.X boylam bilgisidir
            Longitude = station.Location.X,

            IsActive = station.IsActive,

            // Connector listesini response DTO'ya dönüştürür
            Connectors = connectors
                .Select(connector => new ChargingConnectorResponseDto
                {
                    Id = connector.Id,
                    SocketType = connector.SocketType,
                    PowerKw = connector.PowerKw,
                    Quantity = connector.Quantity
                })
                .ToList()
        };
    }

    private static ChargingStationResponseDto MapToResponseDto(
        ChargingStation station)
    {
        // İstasyon entity'sini response DTO'ya dönüştürür
        return new ChargingStationResponseDto
        {
            Id = station.Id,
            Name = station.Name,
            OperatorName = station.OperatorName,
            RegionId = station.RegionId,
            NeighborhoodId = station.NeighborhoodId,
            Address = station.Address,

            // Point.Y enlem bilgisidir
            Latitude = station.Location.Y,

            // Point.X boylam bilgisidir
            Longitude = station.Location.X,

            IsActive = station.IsActive
        };
    }
}