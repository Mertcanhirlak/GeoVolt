using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;
// şarj istasyonu sınıfı, elektrikli araçlar için şarj istasyonlarını temsil eder.
public sealed class ChargingStation
{
    public int Id { get; set; }

    // İstasyonun adı
    public string Name { get; set; } = string.Empty;

    // İstasyonu işleten firma adı
    public string OperatorName { get; set; } = string.Empty;

    // İstasyonun bağlı olduğu bölge kimliği
    public int RegionId { get; set; }

    // İstasyonun açık adresi
    public string Address { get; set; } = string.Empty;

    // İstasyonun coğrafi konumu
    public Point Location { get; set; } = null!;

    // İstasyonun aktif olup olmadığını belirtir
    public bool IsActive { get; set; }
}