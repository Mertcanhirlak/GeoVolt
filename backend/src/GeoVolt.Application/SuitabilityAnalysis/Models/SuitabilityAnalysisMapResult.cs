namespace GeoVolt.Application.SuitabilityAnalysis.Models;

public sealed record SuitabilityAnalysisMapResult(
    int AnalysisRunId,
    int DistrictSourceId,
    string DistrictName,
    string Status,
    int GridEdgeMeters,
    int TotalCellCount,
    int MatchingCellCount,
    int ReturnedCellCount,
    SuitabilityLocationCellResponse? HighestScoreCell,
    SuitabilityLocationCellResponse? LowestScoreCell,
    IReadOnlyList<SuitabilityLocationCellResponse> Cells);
