using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.ChargingStations.Dtos;
using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.ChargingStations;

// Şarj istasyonlarıyla ilgili iş kurallarını yönetir.
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
        // İstasyonları bölge ve mahalle filtrelerine göre getirir.
        var stations = await _chargingStationRepository.GetAllAsync(
            regionSourceId: regionSourceId,
            neighborhoodSourceId: neighborhoodSourceId,
            cancellationToken: cancellationToken);

        return stations
            .Select(MapToResponseDto)
            .ToList();
    }

    public async Task<ChargingStationDetailResponseDto> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        // İstasyonu internal veritabanı kimliğine göre getirir.
        var station = await _chargingStationRepository.GetByIdAsync(
            id,
            cancellationToken);

        if (station is null)
        {
            throw new NotFoundException(
                "Şarj istasyonu bulunamadı.");
        }

        // İstasyona ait connectorları getirir.
        var connectors =
            await _chargingStationRepository
                .GetConnectorsByStationIdAsync(
                    station.Id,
                    cancellationToken);

        return new ChargingStationDetailResponseDto
        {
            Id = station.Id,
            SourceStationNumber = station.SourceStationNumber,
            Name = station.Name,
            OperatorName = station.OperatorName,
            BrandName = station.BrandName,

            // API bölge ve mahalle kaynak kimliklerini döndürür.
            RegionId = station.Region.SourceId,
            RegionName = station.Region.Name,
            NeighborhoodId = station.Neighborhood.SourceId,
            NeighborhoodName = station.Neighborhood.Name,

            Address = station.Address,

            // NTS: X = Longitude, Y = Latitude
            Latitude = station.Location.Y,
            Longitude = station.Location.X,

            IsActive = station.IsActive,
            IsGreenStation = station.IsGreenStation,

            Connectors = connectors
                .Select(connector =>
                    new ChargingConnectorResponseDto
                    {
                        Id = connector.Id,
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
        return new ChargingStationResponseDto
        {
            Id = station.Id,
            SourceStationNumber = station.SourceStationNumber,
            Name = station.Name,
            OperatorName = station.OperatorName,
            BrandName = station.BrandName,

            // API bölge ve mahalle kaynak kimliklerini döndürür.
            RegionId = station.Region.SourceId,
            RegionName = station.Region.Name,
            NeighborhoodId = station.Neighborhood.SourceId,
            NeighborhoodName = station.Neighborhood.Name,

            Address = station.Address,

            // NTS: X = Longitude, Y = Latitude
            Latitude = station.Location.Y,
            Longitude = station.Location.X,

            IsActive = station.IsActive,
            IsGreenStation = station.IsGreenStation
        };
    }
}