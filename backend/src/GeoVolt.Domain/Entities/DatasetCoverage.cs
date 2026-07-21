using GeoVolt.Domain.Constants;
using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;

public sealed class DatasetCoverage
{
    public int Id { get; set; }

    public int DatasetImportId { get; set; }

    public MultiPolygon? CoverageGeometry { get; set; }

    public string CoverageStatus { get; set; } = DatasetCoverageStatuses.Unknown;

    public string CompletenessStatus { get; set; } = DatasetCompletenessStatuses.Unknown;

    public decimal? QualityScore { get; set; }

    public bool IsAuthoritative { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public DatasetImport DatasetImport { get; set; } = null!;
}
