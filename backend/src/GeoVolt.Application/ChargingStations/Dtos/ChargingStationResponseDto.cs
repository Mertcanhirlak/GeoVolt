namespace GeoVolt.Application.ChargingStations.Dtos;
//şarj istasyonu ile ilgili temel bilgileri içeren DTO sınıfı
public sealed class ChargingStationResponseDto
{
    // İstasyonun kimliği
    public int Id { get; set; }

    public string SourceStationNumber { get; set; } = string.Empty;

    // İstasyonun adı
    public string Name { get; set; } = string.Empty;

    // İstasyonu işleten firma adı
    public string OperatorName { get; set; } = string.Empty;

    public string? BrandName { get; set; }

    public string AccessType { get; set; } = string.Empty;

    // İstasyonun bağlı olduğu bölge kimliği
    public int RegionId { get; set; }

    public string RegionName { get; set; } = string.Empty;

    // İstasyonun bağlı olduğu mahalle kimliği
    public int NeighborhoodId { get; set; }

    public string NeighborhoodName { get; set; } = string.Empty;
    // İstasyonun açık adresi
    public string Address { get; set; } = string.Empty;

    // İstasyonun enlem bilgisi
    public double Latitude { get; set; }

    // İstasyonun boylam bilgisi
    public double Longitude { get; set; }

    // İstasyonun aktif olup olmadığını belirtir
    public bool IsActive { get; set; }

    public bool? IsGreenStation { get; set; }

    public int SocketCount { get; set; }

    public double? MaxPowerKw { get; set; }

    public IReadOnlyList<string> SocketTypes { get; set; } = Array.Empty<string>();

    public IReadOnlyList<string> ConnectorTypes { get; set; } = Array.Empty<string>();
}
