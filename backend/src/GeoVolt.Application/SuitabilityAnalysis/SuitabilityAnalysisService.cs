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
}
