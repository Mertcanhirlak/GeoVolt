namespace GeoVolt.Application.SuitabilityAnalysis.Models;

public sealed record SuitabilityGridGenerationResult(
    int AnalysisRunId,
    int DistrictSourceId,
    string DistrictName,
    string Status,
    string AlgorithmVersion,
    int GridEdgeMeters,
    int CellCount,
    int RegionMatchedCellCount,
    int NeighborhoodMatchedCellCount,
    int DatasetLayerCount);
