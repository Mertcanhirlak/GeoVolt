using GeoVolt.Domain.Constants;
using NetTopologySuite.Geometries;

namespace GeoVolt.Domain.Entities;

public sealed class SuitabilityCell
{
    public long Id { get; set; }

    public int AnalysisRunId { get; set; }

    public int CellI { get; set; }

    public int CellJ { get; set; }

    public MultiPolygon Boundary { get; set; } = null!;

    public Point RepresentativePoint { get; set; } = null!;

    public double AreaSquareMeters { get; set; }

    public int? RegionId { get; set; }

    public int? NeighborhoodId { get; set; }

    public string EvaluationStatus { get; set; } = SiteEvaluationStatuses.InsufficientData;

    public bool HasHardExclusion { get; set; }

    public decimal? SuitabilityScore { get; set; }

    public decimal? ConfidenceScore { get; set; }

    public double? NearestTransformerMeters { get; set; }

    public double? NearestMajorRoadMeters { get; set; }

    public double? NearestStationMeters { get; set; }

    public int? PoiCount300Meters { get; set; }

    public int? PoiCount500Meters { get; set; }

    public int? PoiCount1000Meters { get; set; }

    public double? PopulationDensityPerSquareKilometer { get; set; }

    public decimal? SlopePercent { get; set; }

    public decimal? EstimatedCost { get; set; }

    public string MetricDetailsJson { get; set; } = "{}";

    public string ReasonCodesJson { get; set; } = "[]";

    public DateTime? CalculatedAtUtc { get; set; }

    public SuitabilityAnalysisRun AnalysisRun { get; set; } = null!;

    public Region? Region { get; set; }

    public Neighborhood? Neighborhood { get; set; }
}
