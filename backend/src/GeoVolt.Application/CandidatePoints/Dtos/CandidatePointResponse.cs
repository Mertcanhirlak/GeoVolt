namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed record CandidatePointResponse(
    int Id,
    string Name,
    string EstimatedAddress,
    int? RegionId,
    string Region,
    int? NeighborhoodId,
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
    string AlgorithmVersion,
    DateTime? CalculatedAtUtc);
