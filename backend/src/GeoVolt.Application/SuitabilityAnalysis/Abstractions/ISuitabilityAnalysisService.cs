using GeoVolt.Application.SuitabilityAnalysis.Models;

namespace GeoVolt.Application.SuitabilityAnalysis.Abstractions;

public interface ISuitabilityAnalysisService
{
    Task<SuitabilityGridGenerationResult> GenerateGridAsync(
        int districtSourceId,
        GenerateSuitabilityGridRequest request,
        CancellationToken cancellationToken = default);

    Task<SuitabilityMetricCalculationResult> CalculateMetricsAsync(
        int analysisRunId,
        CancellationToken cancellationToken = default);

    Task<SuitabilityScoringResult> CalculateScoresAsync(
        int analysisRunId,
        CancellationToken cancellationToken = default);

    Task<SuitabilityAnalysisMapResult> GetMapCellsAsync(
        int analysisRunId,
        decimal? minimumScore,
        string? evaluationStatus,
        bool onlyRecommended,
        int limit,
        CancellationToken cancellationToken = default);

    Task<SuitabilityLocationEvaluationResponse> EvaluateLocationAsync(
        EvaluateSuitabilityLocationRequest request,
        CancellationToken cancellationToken = default);
}
