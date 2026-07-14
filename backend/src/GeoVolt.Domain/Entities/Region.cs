using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;
//Bölge sınıfı, coğrafi bölgeleri temsil eder.
public sealed class Region
{
    // Veritabanı primary key değeri.
    public int Id { get; set; }
    // Kaynak sistemdeki bölge kimliği

    public int SourceId { get; set; }
    // Bağlı olduğu ilçenin internal DB kimliği.
    public int DistrictId { get; set; }

    public District District { get; set; } = null!;

    // Bölgenin adı
    public string Name { get; set; } = string.Empty;

    // Bölgenin coğrafi sınır bilgisini tutar
    public Geometry Boundary { get; set; } = null!;

    public int Population { get; set; }

    public ICollection<Neighborhood> Neighborhoods { get; set; } = new List<Neighborhood>();
}
