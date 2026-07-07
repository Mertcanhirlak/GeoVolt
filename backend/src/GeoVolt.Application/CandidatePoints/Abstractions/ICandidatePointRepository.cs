using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.CandidatePoints.Abstractions;

public interface ICandidatePointRepository
{
    Task<IReadOnlyList<CandidatePoint>> GetCandidatePointsAsync(CancellationToken cancellationToken);

    Task<CandidatePoint?> GetCandidatePointByIdAsync(int id, CancellationToken cancellationToken);
}
