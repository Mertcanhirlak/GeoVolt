using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.CandidatePoints.Dtos;

public sealed class CreateUserManualCandidateRequest
{
    [Range(-90d, 90d)]
    public double Latitude { get; init; }

    [Range(-180d, 180d)]
    public double Longitude { get; init; }

    [MaxLength(200)]
    public string? Name { get; init; }
}
