using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Domain.Entities;
using GeoVolt.Domain.Constants;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.CandidatePoints;

public sealed class CandidatePointRepository : ICandidatePointRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public CandidatePointRepository(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<CandidatePoint>> GetCandidatePointsAsync(
        CandidatePointQuery query,
        CancellationToken cancellationToken)
    {
        var candidatePoints = _dbContext.CandidatePoints
            .AsNoTracking()
            .Where(item =>
                item.SourceType != CandidatePointSourceTypes.SystemAnalysis
                || item.AlgorithmVersion == CandidatePointAlgorithmVersions.CanonicalGrid200Meters)
            .AsQueryable();

        if (query.RegionId.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.RegionId == query.RegionId.Value);
        }

        if (query.NeighborhoodId.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.NeighborhoodId == query.NeighborhoodId.Value);
        }

        if (query.MinCostScore.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.CostScore >= query.MinCostScore.Value);
        }

        if (query.MaxCostScore.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.CostScore <= query.MaxCostScore.Value);
        }

        if (query.MinDemandScore.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.DemandScore >= query.MinDemandScore.Value);
        }

        if (query.MaxDemandScore.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.DemandScore <= query.MaxDemandScore.Value);
        }

        if (query.MinGeneralScore.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.GeneralScore >= query.MinGeneralScore.Value);
        }

        if (query.MaxGeneralScore.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.GeneralScore <= query.MaxGeneralScore.Value);
        }

        if (query.MinBudget.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.EstimatedCost >= query.MinBudget.Value);
        }

        if (query.MaxBudget.HasValue)
        {
            candidatePoints = candidatePoints.Where(item => item.EstimatedCost <= query.MaxBudget.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.SystemType))
        {
            candidatePoints = candidatePoints.Where(item => item.SystemType == query.SystemType.Trim());
        }

        if (!string.IsNullOrWhiteSpace(query.PlaceType))
        {
            candidatePoints = candidatePoints.Where(item => item.PlaceType == query.PlaceType.Trim());
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            candidatePoints = candidatePoints.Where(item => item.Status == query.Status.Trim());
        }

        if (!string.IsNullOrWhiteSpace(query.SourceType))
        {
            candidatePoints = candidatePoints.Where(item => item.SourceType == query.SourceType.Trim());
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            candidatePoints = candidatePoints.Where(item =>
                EF.Functions.ILike(item.Name, $"%{search}%")
                || EF.Functions.ILike(item.EstimatedAddress, $"%{search}%")
                || EF.Functions.ILike(item.Region, $"%{search}%")
                || EF.Functions.ILike(item.Neighborhood, $"%{search}%"));
        }

        if (query.OnlyOptimal is true)
        {
            candidatePoints = candidatePoints.Where(item => item.GeneralScore >= 80);
        }

        if (!query.IncludeIncomplete)
        {
            candidatePoints = candidatePoints.Where(item =>
                item.Location != null
                && item.EstimatedCost.HasValue
                && item.CostScore.HasValue
                && item.DemandScore.HasValue
                && item.GeneralScore.HasValue);
        }

        return await candidatePoints
            .OrderByDescending(item => item.GeneralScore)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<CandidatePoint?> GetCandidatePointByIdAsync(int id, CancellationToken cancellationToken)
    {
        return _dbContext.CandidatePoints.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public Task<CandidatePoint?> GetBySourceSuitabilityCellIdAsync(long cellId, CancellationToken cancellationToken)
    {
        return _dbContext.CandidatePoints
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.SourceSuitabilityCellId == cellId, cancellationToken);
    }

    public Task<bool> SuitabilityAnalysisRunExistsAsync(
        int analysisRunId,
        CancellationToken cancellationToken)
    {
        return _dbContext.SuitabilityAnalysisRuns
            .AsNoTracking()
            .AnyAsync(item => item.Id == analysisRunId, cancellationToken);
    }

    public Task<int?> GetSuitabilityAnalysisRunGridEdgeMetersAsync(
        int analysisRunId,
        CancellationToken cancellationToken)
    {
        return _dbContext.SuitabilityAnalysisRuns
            .AsNoTracking()
            .Where(item => item.Id == analysisRunId)
            .Select(item => (int?)item.GridEdgeMeters)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<SuitabilityCell?> GetSuitabilityCellAsync(
        int analysisRunId,
        long cellId,
        CancellationToken cancellationToken)
    {
        return _dbContext.SuitabilityCells
            .AsNoTracking()
            .Include(item => item.AnalysisRun)
            .Include(item => item.Region)
            .Include(item => item.Neighborhood)
            .FirstOrDefaultAsync(
                item => item.AnalysisRunId == analysisRunId && item.Id == cellId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<SuitabilityCell>> GetSuitabilityCellsForPromotionAsync(
        int analysisRunId,
        decimal minimumScore,
        CancellationToken cancellationToken)
    {
        return await _dbContext.SuitabilityCells
            .AsNoTracking()
            .Include(item => item.AnalysisRun)
            .Include(item => item.Region)
            .Include(item => item.Neighborhood)
            .Where(item =>
                item.AnalysisRunId == analysisRunId
                && item.SuitabilityScore >= minimumScore
                && !item.HasHardExclusion)
            .OrderByDescending(item => item.SuitabilityScore)
            .ToListAsync(cancellationToken);
    }

    public async Task<SuitabilityCell?> GetCanonicalSuitabilityCellAsync(
        int studyAreaDistrictId,
        int gridEdgeMeters,
        int cellI,
        int cellJ,
        CancellationToken cancellationToken)
    {
        var canonicalRunId = await GetCanonicalRunIdAsync(
            studyAreaDistrictId,
            gridEdgeMeters,
            cancellationToken);

        if (!canonicalRunId.HasValue)
        {
            return null;
        }

        return await _dbContext.SuitabilityCells
            .AsNoTracking()
            .Include(item => item.Region)
            .Include(item => item.Neighborhood)
            .FirstOrDefaultAsync(item =>
                item.AnalysisRunId == canonicalRunId.Value
                && item.CellI == cellI
                && item.CellJ == cellJ,
                cancellationToken);
    }

    public async Task<IReadOnlyList<SuitabilityCell>> GetCanonicalSuitabilityCellsAsync(
        int studyAreaDistrictId,
        int gridEdgeMeters,
        CancellationToken cancellationToken)
    {
        var canonicalRunId = await GetCanonicalRunIdAsync(
            studyAreaDistrictId,
            gridEdgeMeters,
            cancellationToken);

        if (!canonicalRunId.HasValue)
        {
            return [];
        }

        return await _dbContext.SuitabilityCells
            .AsNoTracking()
            .Include(item => item.Region)
            .Include(item => item.Neighborhood)
            .Where(item => item.AnalysisRunId == canonicalRunId.Value)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlySet<long>> GetExistingSourceSuitabilityCellIdsAsync(
        IReadOnlyCollection<long> cellIds,
        CancellationToken cancellationToken)
    {
        if (cellIds.Count == 0)
        {
            return new HashSet<long>();
        }

        var ids = cellIds.ToArray();
        var existingIds = await _dbContext.CandidatePoints
            .AsNoTracking()
            .Where(item => item.SourceSuitabilityCellId.HasValue
                && ids.Contains(item.SourceSuitabilityCellId.Value))
            .Select(item => item.SourceSuitabilityCellId!.Value)
            .ToListAsync(cancellationToken);

        return existingIds.ToHashSet();
    }

    public async Task<CandidatePoint> AddAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken)
    {
        _dbContext.CandidatePoints.Add(candidatePoint);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return candidatePoint;
    }

    public async Task AddRangeAsync(
        IReadOnlyCollection<CandidatePoint> candidatePoints,
        CancellationToken cancellationToken)
    {
        if (candidatePoints.Count == 0)
        {
            return;
        }

        _dbContext.CandidatePoints.AddRange(candidatePoints);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateRangeAsync(
        IReadOnlyCollection<CandidatePoint> candidatePoints,
        CancellationToken cancellationToken)
    {
        if (candidatePoints.Count == 0)
        {
            return;
        }

        _dbContext.CandidatePoints.UpdateRange(candidatePoints);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<CandidatePoint> UpdateAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
        return candidatePoint;
    }

    public async Task DeleteAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken)
    {
        _dbContext.CandidatePoints.Remove(candidatePoint);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private Task<int?> GetCanonicalRunIdAsync(
        int studyAreaDistrictId,
        int gridEdgeMeters,
        CancellationToken cancellationToken)
    {
        return _dbContext.SuitabilityAnalysisRuns
            .AsNoTracking()
            .Where(run =>
                run.StudyAreaDistrictId == studyAreaDistrictId
                && run.GridEdgeMeters == gridEdgeMeters
                && run.CellCount > 0)
            .OrderBy(run => run.Id)
            .Select(run => (int?)run.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
