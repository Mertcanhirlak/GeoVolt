using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.SavedCandidatePoints.Abstractions;

public interface ISavedCandidatePointRepository
{
    Task<IReadOnlyList<int>> GetSavedCandidatePointIdsAsync(int userId, CancellationToken cancellationToken);

    Task<bool> ExistsAsync(int userId, int candidatePointId, CancellationToken cancellationToken);

    Task AddAsync(SavedCandidatePoint savedCandidatePoint, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int userId, int candidatePointId, CancellationToken cancellationToken);
}
