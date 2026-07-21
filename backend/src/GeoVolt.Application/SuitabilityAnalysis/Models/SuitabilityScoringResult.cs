namespace GeoVolt.Application.SuitabilityAnalysis.Models;

public sealed record SuitabilityScoringResult(
    int AnalysisRunId,
    string Status,
    int ScoringProfileId,
    string ScoringProfileName,
    string ScoringVersion,
    int ScoredCellCount,
    int ProvisionalRecommendedCellCount,
    decimal MinimumScore,
    decimal AverageScore,
    decimal MaximumScore,
    bool DatasetCoverageVerified,
    DateTime CalculatedAtUtc);
