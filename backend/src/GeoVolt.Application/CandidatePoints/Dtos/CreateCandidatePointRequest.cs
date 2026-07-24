using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed record CreateCandidatePointRequest(
    [Required, MaxLength(250)] string Name,
    [MaxLength(500)] string? EstimatedAddress,
    [MaxLength(150)] string? Region,
    [MaxLength(150)] string? Neighborhood,
    decimal? EstimatedCost,
    [Range(0, 100)] int? CostScore,
    [Range(0, 100)] int? DemandScore,
    [Range(0, 100)] int? GeneralScore,
    [Range(-90, 90)] double Latitude,
    [Range(-180, 180)] double Longitude,
    int? RegionId,
    int? NeighborhoodId,
    [MaxLength(100)] string? SystemType,
    [MaxLength(100)] string? PlaceType,
    [MaxLength(50)] string? Status);
