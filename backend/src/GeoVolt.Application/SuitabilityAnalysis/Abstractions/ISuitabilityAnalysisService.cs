using GeoVolt.Application.SuitabilityAnalysis.Models;

namespace GeoVolt.Application.SuitabilityAnalysis.Abstractions;

public interface ISuitabilityAnalysisService
{
    Task<SuitabilityGridGenerationResult> GenerateGridAsync(
        int districtSourceId,
        GenerateSuitabilityGridRequest request,
        CancellationToken cancellationToken = default);
}
