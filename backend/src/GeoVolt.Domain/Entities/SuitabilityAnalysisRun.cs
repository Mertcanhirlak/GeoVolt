using GeoVolt.Domain.Constants;

namespace GeoVolt.Domain.Entities;

public sealed class SuitabilityAnalysisRun
{
    public int Id { get; set; }

    public int StudyAreaDistrictId { get; set; }

    public int? ScoringProfileId { get; set; }

    public string Status { get; set; } = AnalysisRunStatuses.Pending;

    public string AlgorithmVersion { get; set; } = "v1";

    public int GridEdgeMeters { get; set; } = SuitabilityGridDefaults.EdgeMeters;

    public int MetricSrid { get; set; } = SuitabilityGridDefaults.MetricSrid;

    public int StorageSrid { get; set; } = SuitabilityGridDefaults.StorageSrid;

    public string DatasetSnapshotJson { get; set; } = "{}";

    public string ParametersJson { get; set; } = "{}";

    public int CellCount { get; set; }

    public int CandidateCellCount { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? StartedAtUtc { get; set; }

    public DateTime? CompletedAtUtc { get; set; }

    public string? ErrorMessage { get; set; }

    public District StudyAreaDistrict { get; set; } = null!;

    public ScoringProfile? ScoringProfile { get; set; }

    public ICollection<SuitabilityCell> Cells { get; set; } = [];
}
