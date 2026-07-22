using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;

namespace GeoVolt.Application.CandidatePoints.Abstractions;

public interface ICandidatePointService
{
    Task<ApiResponse<IReadOnlyList<CandidatePointResponse>>> GetCandidatePointsAsync(
        CandidatePointQuery query,
        CancellationToken cancellationToken);

    Task<ApiResponse<CandidatePointResponse>> CreateAsync(
        CreateCandidatePointRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<CandidatePointResponse>> UpdateAsync(
        int id,
        UpdateCandidatePointRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<int>> DeleteAsync(int id, CancellationToken cancellationToken);

    Task<ApiResponse<CandidatePointPromotionResult>> PromoteSuitabilityCellAsync(
        int analysisRunId,
        long cellId,
        int createdByUserId,
        CancellationToken cancellationToken);

    Task<ApiResponse<CandidatePointResponse>> CreateUserManualAsync(
        CreateUserManualCandidateRequest request,
        int createdByUserId,
        CancellationToken cancellationToken);
}
