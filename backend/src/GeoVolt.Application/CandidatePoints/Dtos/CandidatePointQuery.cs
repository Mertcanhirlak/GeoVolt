using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed class CandidatePointQuery
{
    [Range(1, int.MaxValue)]
    public int? RegionId { get; init; }

    [Range(1, int.MaxValue)]
    public int? NeighborhoodId { get; init; }

    [Range(0, 100)]
    public int? MinCostScore { get; init; }

    [Range(0, 100)]
    public int? MaxCostScore { get; init; }

    [Range(0, 100)]
    public int? MinDemandScore { get; init; }

    [Range(0, 100)]
    public int? MaxDemandScore { get; init; }

    [Range(0, 100)]
    public int? MinGeneralScore { get; init; }

    [Range(0, 100)]
    public int? MaxGeneralScore { get; init; }

    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal? MinBudget { get; init; }

    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal? MaxBudget { get; init; }

    public string? SystemType { get; init; }

    public string? PlaceType { get; init; }

    public bool? OnlyOptimal { get; init; }

    public bool IncludeIncomplete { get; init; }
}
