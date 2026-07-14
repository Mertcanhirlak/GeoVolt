using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;

public sealed class Poi
{
    public int Id { get; set; }

    public long SourceId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string? SubCategory { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public string? Website { get; set; }

    public Point Location { get; set; } = null!;
}
