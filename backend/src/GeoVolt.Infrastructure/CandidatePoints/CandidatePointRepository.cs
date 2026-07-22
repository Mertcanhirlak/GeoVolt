using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Domain.Entities;
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
        var candidatePoints = _dbContext.CandidatePoints.AsNoTracking().AsQueryable();

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

    public Task<SuitabilityCell?> GetSuitabilityCellAsync(
        int analysisRunId,
        long cellId,
        CancellationToken cancellationToken)
    {
        return _dbContext.SuitabilityCells
            .AsNoTracking()
            .Include(item => item.Region)
            .Include(item => item.Neighborhood)
            .FirstOrDefaultAsync(
                item => item.AnalysisRunId == analysisRunId && item.Id == cellId,
                cancellationToken);
    }

    public async Task<CandidatePoint> AddAsync(CandidatePoint candidatePoint, CancellationToken cancellationToken)
    {
        _dbContext.CandidatePoints.Add(candidatePoint);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return candidatePoint;
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
}
