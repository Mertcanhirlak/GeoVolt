namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed record BulkCandidatePointPromotionResult(
    int AnalysisRunId,
    decimal MinimumScore,
    int EligibleCellCount,
    int CreatedCount,
    int AlreadyExistingCount);
