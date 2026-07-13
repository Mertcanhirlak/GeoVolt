using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;
// şarj istasyonu sınıfı, elektrikli araçlar için şarj istasyonlarını temsil eder.
public sealed class ChargingStation
{
    public int Id { get; set; }

    public string SourceStationNumber { get; set; } = string.Empty;

    // İstasyonun adı
    public string Name { get; set; } = string.Empty;

    // İstasyonu işleten firma adı
    public string OperatorName { get; set; } = string.Empty;

    public string? BrandName { get; set; }

    // İstasyonun bağlı olduğu bölge kimliği
    public int RegionId { get; set; }

    public Region Region { get; set; } = null!;
    // İstasyonun bağlı olduğu mahalle kimliği
    public int NeighborhoodId { get; set; }

    public Neighborhood Neighborhood { get; set; } = null!;
    // İstasyonun açık adresi
    public string Address { get; set; } = string.Empty;

    // İstasyonun coğrafi konumu
    public Point Location { get; set; } = null!;

    // İstasyonun aktif olup olmadığını belirtir
    public bool IsActive { get; set; }

    public bool? IsGreenStation { get; set; }

    public ICollection<ChargingConnector> Connectors { get; set; } = new List<ChargingConnector>();
}
