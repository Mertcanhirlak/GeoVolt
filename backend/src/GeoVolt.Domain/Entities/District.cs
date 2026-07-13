using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;

public sealed class District
{
    public int Id { get; set; }

    public int SourceId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int? Population { get; set; }

    public Geometry Boundary { get; set; } = null!;

    public ICollection<Region> Regions { get; set; } = new List<Region>();
}
