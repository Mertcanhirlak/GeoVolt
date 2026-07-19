using GeoVolt.Application.SuitabilityAnalysis.Models;

namespace GeoVolt.Application.SuitabilityAnalysis.Abstractions;

public interface ISuitabilityAnalysisRepository
{
    Task<SuitabilityGridGenerationResult?> GenerateGridAsync(
        int districtSourceId,
        int gridEdgeMeters,
        CancellationToken cancellationToken = default);
}
