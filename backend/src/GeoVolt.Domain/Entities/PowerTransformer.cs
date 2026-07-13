using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;

public sealed class PowerTransformer
{
    public int Id { get; set; }

    public long SourceId { get; set; }

    public string? Name { get; set; }

    public string? TransformerType { get; set; }

    public Point Location { get; set; } = null!;
}
