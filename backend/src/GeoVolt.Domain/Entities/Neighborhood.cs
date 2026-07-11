using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;

public sealed class Neighborhood
{
    // Mahallenin benzersiz kimliği
    public int Id { get; set; }

    public int SourceId { get; set; }

    // Mahallenin adı
    public string Name { get; set; } = string.Empty;

    // Mahallenin bağlı olduğu bölge kimliği
    public int RegionId { get; set; }

    public Region Region { get; set; } = null!;

    // Mahallenin coğrafi sınır bilgisini tutar
    public Geometry Boundary { get; set; } = null!;

    public int Population { get; set; }

    public ICollection<ChargingStation> ChargingStations { get; set; } = new List<ChargingStation>();
}
