namespace GeoVolt.Application.ChargingStations.Dtos;

// Şarj istasyonunun detay bilgisini taşır.
public sealed class ChargingStationDetailResponseDto
{
    public int Id { get; set; }

    public string SourceStationNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string OperatorName { get; set; } = string.Empty;

    public string? BrandName { get; set; }

    public int RegionId { get; set; }

    public string RegionName { get; set; } = string.Empty;

    public int NeighborhoodId { get; set; }

    public string NeighborhoodName { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public bool IsActive { get; set; }

    public bool? IsGreenStation { get; set; }

    public IReadOnlyList<ChargingConnectorResponseDto> Connectors { get; set; }
        = [];
}