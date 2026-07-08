using GeoVolt.Application.CandidatePoints.Dtos;

namespace GeoVolt.Application.SavedCandidatePoints.Abstractions;

public interface ISavedCandidatePointService
{
    Task<IReadOnlyList<CandidatePointResponse>> GetSavedCandidatePointsAsync(
        int userId,
        CancellationToken cancellationToken);

    Task<CandidatePointResponse?> SaveAsync(
        int userId,
        int candidatePointId,
        CancellationToken cancellationToken);

    Task<bool> DeleteAsync(
        int userId,
        int candidatePointId,
        CancellationToken cancellationToken);
}
