using System.Text.Json;

namespace GeoVolt.Application.SuitabilityAnalysis.Models;

public sealed record SuitabilityLocationEvaluationResponse(
    double Latitude,
    double Longitude,
    bool IsInsideStudyArea,
    int? DistrictId,
    string? DistrictName,
    int? AnalysisRunId,
    string EvaluationStatus,
    string Message,
    SuitabilityLocationCellResponse? SelectedCell,
    IReadOnlyList<SuitabilityLocationCellResponse> Recommendations);

public sealed record SuitabilityLocationCellResponse(
    long CellId,
    int CellI,
    int CellJ,
    string EvaluationStatus,
    bool HasHardExclusion,
    bool IsProvisionalRecommendation,
    bool DatasetCoverageVerified,
    decimal? SuitabilityScore,
    decimal? ConfidenceScore,
    double? DistanceMeters,
    int? RecommendationRank,
    int? RegionId,
    string? RegionName,
    int? NeighborhoodId,
    string? NeighborhoodName,
    JsonElement Boundary,
    SuitabilityMetricResponse Metrics,
    SuitabilityScoreBreakdownResponse Scores,
    IReadOnlyList<string> ReasonCodes);

public sealed record SuitabilityMetricResponse(
    double? NearestTransformerMeters,
    double? NearestMajorRoadMeters,
    double? NearestStationMeters,
    int? PoiCount300Meters,
    int? PoiCount500Meters,
    int? PoiCount1000Meters,
    double? PopulationDensityPerSquareKilometer,
    decimal? SlopePercent);

public sealed record SuitabilityScoreBreakdownResponse(
    decimal? TransformerScore,
    decimal? MajorRoadScore,
    decimal? PoiScore,
    decimal? PopulationScore,
    decimal? StationGapScore,
    decimal? SlopeScore);
