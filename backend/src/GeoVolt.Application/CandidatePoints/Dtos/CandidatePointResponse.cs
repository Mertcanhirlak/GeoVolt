namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed record CandidatePointResponse(
    int Id,
    string Name,
    string EstimatedAddress,
    string Region,
    string Neighborhood,
    decimal? EstimatedCost,
    int? CostScore,
    int? DemandScore,
    int? GeneralScore,
    double Latitude,
    double Longitude,
    string SystemType,
    string PlaceType,
    string Status,
    string SourceType,
    int? CreatedByUserId,
    int? SourceAnalysisRunId,
    long? SourceSuitabilityCellId,
    DateTime CreatedAtUtc);
