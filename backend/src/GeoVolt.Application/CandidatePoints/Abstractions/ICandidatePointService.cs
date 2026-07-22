using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;

namespace GeoVolt.Application.CandidatePoints.Abstractions;

public interface ICandidatePointService
{
    Task<ApiResponse<IReadOnlyList<CandidatePointResponse>>> GetCandidatePointsAsync(
        CandidatePointQuery query,
        CancellationToken cancellationToken);
}
