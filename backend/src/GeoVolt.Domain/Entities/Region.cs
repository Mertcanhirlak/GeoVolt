using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;
//Bölge sınıfı, coğrafi bölgeleri temsil eder.
public sealed class Region
{
    public int Id { get; set; }

    // Bölgenin adı
    public string Name { get; set; } = string.Empty;

    // Bölgenin coğrafi sınır bilgisini tutar
    public Geometry Boundary { get; set; } = null!;
}