using GeoVolt.Application.CandidatePoints;
using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.SavedCandidatePoints.Abstractions;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.SavedCandidatePoints;

public sealed class SavedCandidatePointService : ISavedCandidatePointService
{
    private readonly ICandidatePointRepository _candidatePointRepository;
    private readonly ISavedCandidatePointRepository _savedCandidatePointRepository;

    public SavedCandidatePointService(
        ICandidatePointRepository candidatePointRepository,
        ISavedCandidatePointRepository savedCandidatePointRepository)
    {
        _candidatePointRepository = candidatePointRepository;
        _savedCandidatePointRepository = savedCandidatePointRepository;
    }

    public async Task<IReadOnlyList<CandidatePointResponse>> GetSavedCandidatePointsAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        var savedIds = await _savedCandidatePointRepository.GetSavedCandidatePointIdsAsync(
            userId,
            cancellationToken);

        if (savedIds.Count == 0)
        {
            return [];
        }

        var candidatePoints = await _candidatePointRepository.GetCandidatePointsAsync(
            cancellationToken);

        var candidatePointMap = candidatePoints.ToDictionary(
            candidatePoint => candidatePoint.Id);

        return savedIds
            .Where(candidatePointMap.ContainsKey)
            .Select(candidatePointId =>
                CandidatePointService.ToResponse(candidatePointMap[candidatePointId]))
            .ToList();
    }

    public async Task<CandidatePointResponse?> SaveAsync(
        int userId,
        int candidatePointId,
        CancellationToken cancellationToken)
    {
        var candidatePoint = await _candidatePointRepository.GetCandidatePointByIdAsync(
            candidatePointId,
            cancellationToken);

        if (candidatePoint is null)
        {
            return null;
        }

        var alreadySaved = await _savedCandidatePointRepository.ExistsAsync(
            userId,
            candidatePointId,
            cancellationToken);

        if (!alreadySaved)
        {
            await _savedCandidatePointRepository.AddAsync(
                new SavedCandidatePoint
                {
                    UserId = userId,
                    CandidatePointId = candidatePointId
                },
                cancellationToken);
        }

        return CandidatePointService.ToResponse(candidatePoint);
    }

    public Task<bool> DeleteAsync(
        int userId,
        int candidatePointId,
        CancellationToken cancellationToken)
    {
        return _savedCandidatePointRepository.DeleteAsync(
            userId,
            candidatePointId,
            cancellationToken);
    }
}
