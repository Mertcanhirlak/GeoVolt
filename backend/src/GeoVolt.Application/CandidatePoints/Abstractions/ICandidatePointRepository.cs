using GeoVolt.Domain.Entities;
using GeoVolt.Application.CandidatePoints.Dtos;

namespace GeoVolt.Application.CandidatePoints.Abstractions;

public interface ICandidatePointRepository
{
    Task<IReadOnlyList<CandidatePoint>> GetCandidatePointsAsync(
        CandidatePointQuery query,
        CancellationToken cancellationToken);

    Task<CandidatePoint?> GetCandidatePointByIdAsync(int id, CancellationToken cancellationToken);

    Task<CandidatePoint?> GetBySourceSuitabilityCellIdAsync(long cellId, CancellationToken cancellationToken);

    Task<SuitabilityCell?> GetSuitabilityCellAsync(
        int analysisRunId,
        long cellId,
        CancellationToken cancellationToken);

    Task<CandidatePoint> AddAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken);

    Task<CandidatePoint> UpdateAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken);

    Task DeleteAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken);
}
