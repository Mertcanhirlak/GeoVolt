using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.CandidatePoints;

public sealed class CandidatePointService : ICandidatePointService
{
    private readonly ICandidatePointRepository _candidatePointRepository;

    public CandidatePointService(ICandidatePointRepository candidatePointRepository)
    {
        _candidatePointRepository = candidatePointRepository;
    }

    public async Task<ApiResponse<IReadOnlyList<CandidatePointResponse>>> GetCandidatePointsAsync(CancellationToken cancellationToken)
    {
        var candidatePoints = await _candidatePointRepository.GetCandidatePointsAsync(cancellationToken);
        var response = candidatePoints.Select(ToResponse).ToList();

        return ApiResponse<IReadOnlyList<CandidatePointResponse>>.Ok(response);
    }

    private static CandidatePointResponse ToResponse(CandidatePoint candidatePoint)
    {
        return new CandidatePointResponse(
            candidatePoint.Id,
            candidatePoint.Name,
            candidatePoint.EstimatedAddress,
            candidatePoint.Region,
            candidatePoint.Neighborhood,
            candidatePoint.EstimatedCost,
            candidatePoint.CostScore,
            candidatePoint.DemandScore,
            candidatePoint.GeneralScore,
            candidatePoint.Latitude,
            candidatePoint.Longitude,
            candidatePoint.SystemType,
            candidatePoint.PlaceType,
            candidatePoint.Status);
    }
}
