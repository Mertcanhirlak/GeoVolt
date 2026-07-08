namespace GeoVolt.Application.ChargingStations.Dtos;
//şarj istasyonu ile ilgili temel bilgileri içeren DTO sınıfı
public sealed class ChargingStationResponseDto
{
    // İstasyonun kimliği
    public int Id { get; set; }

    // İstasyonun adı
    public string Name { get; set; } = string.Empty;

    // İstasyonu işleten firma adı
    public string OperatorName { get; set; } = string.Empty;

    // İstasyonun bağlı olduğu bölge kimliği
    public int RegionId { get; set; }

    // İstasyonun açık adresi
    public string Address { get; set; } = string.Empty;

    // İstasyonun enlem bilgisi
    public double Latitude { get; set; }

    // İstasyonun boylam bilgisi
    public double Longitude { get; set; }

    // İstasyonun aktif olup olmadığını belirtir
    public bool IsActive { get; set; }
}