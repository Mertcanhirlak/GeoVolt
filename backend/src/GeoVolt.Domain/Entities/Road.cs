using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;

public sealed class Road
{
    public int Id { get; set; }

    public long SourceId { get; set; }

    public string? Name { get; set; }

    public string RoadType { get; set; } = string.Empty;

    public double? Speed { get; set; }

    public double? AverageSpeed { get; set; }

    public Geometry Geometry { get; set; } = null!;
}
