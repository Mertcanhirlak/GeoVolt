using GeoVolt.Application.SuitabilityAnalysis.Models;

namespace GeoVolt.Application.SuitabilityAnalysis.Abstractions;

public interface ISuitabilityAnalysisRepository
{
    Task<SuitabilityGridGenerationResult?> GenerateGridAsync(
        int districtSourceId,
        int gridEdgeMeters,
        CancellationToken cancellationToken = default);

    Task<SuitabilityMetricCalculationResult?> CalculateMetricsAsync(
        int analysisRunId,
        CancellationToken cancellationToken = default);

    Task<SuitabilityScoringResult?> CalculateScoresAsync(
        int analysisRunId,
        CancellationToken cancellationToken = default);

    Task<SuitabilityLocationEvaluationResponse> EvaluateLocationAsync(
        double latitude,
        double longitude,
        int recommendationLimit,
        CancellationToken cancellationToken = default);
}
