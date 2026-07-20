using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.SuitabilityAnalysis.Models;

public sealed class EvaluateSuitabilityLocationRequest
{
    [Range(-90d, 90d)]
    public double Latitude { get; init; }

    [Range(-180d, 180d)]
    public double Longitude { get; init; }

    [Range(1, 10)]
    public int RecommendationLimit { get; init; } = 3;
}
