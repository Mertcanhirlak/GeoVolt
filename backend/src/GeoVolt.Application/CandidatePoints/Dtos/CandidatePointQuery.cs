namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed record CandidatePointQuery(
    int? RegionId = null,
    int? NeighborhoodId = null,
    int? MinCostScore = null,
    int? MaxCostScore = null,
    int? MinDemandScore = null,
    int? MaxDemandScore = null,
    int? MinGeneralScore = null,
    int? MaxGeneralScore = null,
    decimal? MinBudget = null,
    decimal? MaxBudget = null,
    string? SystemType = null,
    string? PlaceType = null,
    string? Status = null,
    string? SourceType = null,
    string? Search = null);
