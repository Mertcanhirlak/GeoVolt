namespace GeoVolt.Application.ChargingStations.Dtos;

// Şarj istasyonu liste bilgisini taşır.
public sealed class ChargingStationResponseDto
{
    // İstasyonun internal veritabanı kimliği.
    public int Id { get; set; }

    // Kaynak verideki istasyon numarası.
    public string SourceStationNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string OperatorName { get; set; } = string.Empty;

    public string? BrandName { get; set; }

    // Bölgenin API’de kullanılan kimliği.
    public int RegionId { get; set; }

    public string RegionName { get; set; } = string.Empty;

    // Mahallenin API’de kullanılan kimliği.
    public int NeighborhoodId { get; set; }

    public string NeighborhoodName { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public bool IsActive { get; set; }

    public bool? IsGreenStation { get; set; }
}