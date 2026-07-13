namespace GeoVolt.Domain.Entities;

public sealed class StagedGeoJsonFeature
{
    public long Id { get; set; }

    public int DatasetImportId { get; set; }

    public DatasetImport DatasetImport { get; set; } = null!;

    public int FeatureIndex { get; set; }

    public string? SourceFeatureId { get; set; }

    public string GeometryType { get; set; } = string.Empty;

    public string PropertiesJson { get; set; } = "{}";

    public string GeometryJson { get; set; } = "{}";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
