namespace GeoVolt.Domain.Entities;

public sealed class DatasetImport
{
    public int Id { get; set; }

    public string DatasetName { get; set; } = string.Empty;

    public string SourceFile { get; set; } = string.Empty;

    public string Sha256 { get; set; } = string.Empty;

    public DateTime? SourceDateUtc { get; set; }

    public int FeatureCount { get; set; }

    public int? SourceSrid { get; set; }

    public int TargetSrid { get; set; } = 4326;

    public DateTime ImportedAtUtc { get; set; } = DateTime.UtcNow;

    public string Status { get; set; } = string.Empty;

    public string? ErrorMessage { get; set; }

    public DatasetCoverage? Coverage { get; set; }

    public ICollection<StagedGeoJsonFeature> StagedFeatures { get; set; } = [];
}
