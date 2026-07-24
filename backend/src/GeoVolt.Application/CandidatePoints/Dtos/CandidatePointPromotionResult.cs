namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed record CandidatePointPromotionResult(
    bool Created,
    CandidatePointResponse CandidatePoint);
