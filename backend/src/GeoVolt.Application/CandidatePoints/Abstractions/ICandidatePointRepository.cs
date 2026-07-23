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

    Task<bool> SuitabilityAnalysisRunExistsAsync(int analysisRunId, CancellationToken cancellationToken);

    Task<int?> GetSuitabilityAnalysisRunGridEdgeMetersAsync(
        int analysisRunId,
        CancellationToken cancellationToken);

    Task<SuitabilityCell?> GetSuitabilityCellAsync(
        int analysisRunId,
        long cellId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<SuitabilityCell>> GetSuitabilityCellsForPromotionAsync(
        int analysisRunId,
        decimal minimumScore,
        CancellationToken cancellationToken);

    Task<SuitabilityCell?> GetCanonicalSuitabilityCellAsync(
        int studyAreaDistrictId,
        int gridEdgeMeters,
        int cellI,
        int cellJ,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<SuitabilityCell>> GetCanonicalSuitabilityCellsAsync(
        int studyAreaDistrictId,
        int gridEdgeMeters,
        CancellationToken cancellationToken);

    Task<IReadOnlySet<long>> GetExistingSourceSuitabilityCellIdsAsync(
        IReadOnlyCollection<long> cellIds,
        CancellationToken cancellationToken);

    Task<CandidatePoint> AddAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken);

    Task AddRangeAsync(IReadOnlyCollection<CandidatePoint> candidatePoints, CancellationToken cancellationToken);

    Task<CandidatePoint> UpdateAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken);

    Task DeleteAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken);
}
