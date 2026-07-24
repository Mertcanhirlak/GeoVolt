using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed record CandidatePointQuery(
    [Range(1, int.MaxValue)]
    int? RegionId = null,
    [Range(1, int.MaxValue)]
    int? NeighborhoodId = null,
    [Range(0, 100)]
    int? MinCostScore = null,
    [Range(0, 100)]
    int? MaxCostScore = null,
    [Range(0, 100)]
    int? MinDemandScore = null,
    [Range(0, 100)]
    int? MaxDemandScore = null,
    [Range(0, 100)]
    int? MinGeneralScore = null,
    [Range(0, 100)]
    int? MaxGeneralScore = null,
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    decimal? MinBudget = null,
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    decimal? MaxBudget = null,
    string? SystemType = null,
    string? PlaceType = null,
    string? Status = null,
    string? SourceType = null,
    string? Search = null,
    bool? OnlyOptimal = null,
    bool IncludeIncomplete = false);
