using GeoVolt.Application.SavedCandidatePoints.Abstractions;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.SavedCandidatePoints;

public sealed class SavedCandidatePointRepository : ISavedCandidatePointRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public SavedCandidatePointRepository(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<int>> GetSavedCandidatePointIdsAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.SavedCandidatePoints
            .AsNoTracking()
            .Where(savedCandidatePoint => savedCandidatePoint.UserId == userId)
            .OrderByDescending(savedCandidatePoint => savedCandidatePoint.CreatedAtUtc)
            .Select(savedCandidatePoint => savedCandidatePoint.CandidatePointId)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> ExistsAsync(
        int userId,
        int candidatePointId,
        CancellationToken cancellationToken)
    {
        return _dbContext.SavedCandidatePoints.AnyAsync(
            savedCandidatePoint =>
                savedCandidatePoint.UserId == userId &&
                savedCandidatePoint.CandidatePointId == candidatePointId,
            cancellationToken);
    }

    public async Task AddAsync(
        SavedCandidatePoint savedCandidatePoint,
        CancellationToken cancellationToken)
    {
        _dbContext.SavedCandidatePoints.Add(savedCandidatePoint);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(
        int userId,
        int candidatePointId,
        CancellationToken cancellationToken)
    {
        var savedCandidatePoint = await _dbContext.SavedCandidatePoints.FirstOrDefaultAsync(
            savedCandidatePoint =>
                savedCandidatePoint.UserId == userId &&
                savedCandidatePoint.CandidatePointId == candidatePointId,
            cancellationToken);

        if (savedCandidatePoint is null)
        {
            return false;
        }

        _dbContext.SavedCandidatePoints.Remove(savedCandidatePoint);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }
}
