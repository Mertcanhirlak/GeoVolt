using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;
//Bölge sınıfı, coğrafi bölgeleri temsil eder.
public sealed class Region
{
    public int Id { get; set; }

    public int SourceId { get; set; }

    public int DistrictId { get; set; }

    public District District { get; set; } = null!;

    // Bölgenin adı
    public string Name { get; set; } = string.Empty;

    // Bölgenin coğrafi sınır bilgisini tutar
    public Geometry Boundary { get; set; } = null!;

    public int Population { get; set; }

    public ICollection<Neighborhood> Neighborhoods { get; set; } = new List<Neighborhood>();
}
