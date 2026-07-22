namespace GeoVolt.Application.SuitabilityAnalysis.Models;

public sealed record SuitabilityFullAnalysisResult(
    int RegionSourceId,
    string RegionName,
    SuitabilityGridGenerationResult Grid,
    SuitabilityMetricCalculationResult Metrics,
    SuitabilityScoringResult Scoring);
