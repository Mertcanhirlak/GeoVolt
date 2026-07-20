using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis.Models;

namespace GeoVolt.Application.SuitabilityAnalysis;

public sealed class SuitabilityAnalysisService : ISuitabilityAnalysisService
{
    private readonly ISuitabilityAnalysisRepository _repository;

    public SuitabilityAnalysisService(ISuitabilityAnalysisRepository repository)
    {
        _repository = repository;
    }

    public async Task<SuitabilityGridGenerationResult> GenerateGridAsync(
        int districtSourceId,
        GenerateSuitabilityGridRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _repository.GenerateGridAsync(
            districtSourceId,
            request.GridEdgeMeters,
            cancellationToken);

        return result ?? throw new NotFoundException("İlçe bulunamadı.");
    }

    public async Task<SuitabilityMetricCalculationResult> CalculateMetricsAsync(
        int analysisRunId,
        CancellationToken cancellationToken = default)
    {
        var result = await _repository.CalculateMetricsAsync(
            analysisRunId,
            cancellationToken);

        return result ?? throw new NotFoundException("Uygunluk analiz çalışması bulunamadı.");
    }

    public async Task<SuitabilityScoringResult> CalculateScoresAsync(
        int analysisRunId,
        CancellationToken cancellationToken = default)
    {
        var result = await _repository.CalculateScoresAsync(
            analysisRunId,
            cancellationToken);

        return result ?? throw new NotFoundException("Uygunluk analiz çalışması bulunamadı.");
    }

    public Task<SuitabilityLocationEvaluationResponse> EvaluateLocationAsync(
        EvaluateSuitabilityLocationRequest request,
        CancellationToken cancellationToken = default)
    {
        return _repository.EvaluateLocationAsync(
            request.Latitude,
            request.Longitude,
            request.RecommendationLimit,
            cancellationToken);
    }
}
