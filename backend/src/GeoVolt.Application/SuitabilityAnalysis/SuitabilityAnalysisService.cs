using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using GeoVolt.Application.Regions.Abstractions;

namespace GeoVolt.Application.SuitabilityAnalysis;

public sealed class SuitabilityAnalysisService : ISuitabilityAnalysisService
{
    private readonly ISuitabilityAnalysisRepository _repository;
    private readonly IRegionRepository _regionRepository;

    public SuitabilityAnalysisService(
        ISuitabilityAnalysisRepository repository,
        IRegionRepository regionRepository)
    {
        _repository = repository;
        _regionRepository = regionRepository;
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

    public async Task<SuitabilityFullAnalysisResult> RunFullAnalysisForRegionAsync(
        int regionSourceId,
        GenerateSuitabilityGridRequest request,
        CancellationToken cancellationToken = default)
    {
        var region = await _regionRepository.GetBySourceIdAsync(
            regionSourceId,
            cancellationToken);

        if (region is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

        if (region.District is null)
        {
            throw new InvalidOperationException("Bölgenin ilçe bilgisi yüklenemedi.");
        }

        var grid = await GenerateGridAsync(
            region.District.SourceId,
            request,
            cancellationToken);

        var metrics = await CalculateMetricsAsync(
            grid.AnalysisRunId,
            cancellationToken);

        var scoring = await CalculateScoresAsync(
            grid.AnalysisRunId,
            cancellationToken);

        return new SuitabilityFullAnalysisResult(
            region.SourceId,
            region.Name,
            grid,
            metrics,
            scoring);
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
