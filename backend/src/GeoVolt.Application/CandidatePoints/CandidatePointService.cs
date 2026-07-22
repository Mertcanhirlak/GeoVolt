using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.CandidatePoints;

public sealed class CandidatePointService : ICandidatePointService
{
    private const int OptimalGeneralScore = 80;

    private readonly ICandidatePointRepository _candidatePointRepository;

    public CandidatePointService(ICandidatePointRepository candidatePointRepository)
    {
        _candidatePointRepository = candidatePointRepository;
    }

    public async Task<ApiResponse<IReadOnlyList<CandidatePointResponse>>> GetCandidatePointsAsync(
        CandidatePointQuery query,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        var candidatePoints = await _candidatePointRepository.GetCandidatePointsAsync(
            cancellationToken);

        IEnumerable<CandidatePoint> filtered = candidatePoints;

        if (!query.IncludeIncomplete)
        {
            filtered = filtered.Where(HasCompleteCalculation);
        }

        if (query.RegionId.HasValue)
        {
            filtered = filtered.Where(candidatePoint =>
                candidatePoint.RegionId == query.RegionId.Value);
        }

        if (query.NeighborhoodId.HasValue)
        {
            filtered = filtered.Where(candidatePoint =>
                candidatePoint.NeighborhoodId == query.NeighborhoodId.Value);
        }

        filtered = ApplyScoreRange(
            filtered,
            candidatePoint => candidatePoint.CostScore,
            query.MinCostScore,
            query.MaxCostScore);

        filtered = ApplyScoreRange(
            filtered,
            candidatePoint => candidatePoint.DemandScore,
            query.MinDemandScore,
            query.MaxDemandScore);

        filtered = ApplyScoreRange(
            filtered,
            candidatePoint => candidatePoint.GeneralScore,
            query.MinGeneralScore,
            query.MaxGeneralScore);

        if (query.MinBudget.HasValue)
        {
            filtered = filtered.Where(candidatePoint =>
                candidatePoint.EstimatedCost.HasValue &&
                candidatePoint.EstimatedCost.Value >= query.MinBudget.Value);
        }

        if (query.MaxBudget.HasValue)
        {
            filtered = filtered.Where(candidatePoint =>
                candidatePoint.EstimatedCost.HasValue &&
                candidatePoint.EstimatedCost.Value <= query.MaxBudget.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.SystemType))
        {
            filtered = filtered.Where(candidatePoint =>
                string.Equals(
                    candidatePoint.SystemType.Trim(),
                    query.SystemType.Trim(),
                    StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.PlaceType))
        {
            var placeTypeComparer = StringComparer.Create(
                System.Globalization.CultureInfo.GetCultureInfo("tr-TR"),
                ignoreCase: true);

            filtered = filtered.Where(candidatePoint =>
                placeTypeComparer.Equals(
                    candidatePoint.PlaceType.Trim(),
                    query.PlaceType.Trim()));
        }

        if (query.OnlyOptimal is true)
        {
            filtered = filtered.Where(candidatePoint =>
                candidatePoint.GeneralScore >= OptimalGeneralScore);
        }

        var response = filtered
            .OrderByDescending(candidatePoint => candidatePoint.GeneralScore)
            .ThenByDescending(candidatePoint => candidatePoint.DemandScore)
            .ThenBy(candidatePoint => candidatePoint.EstimatedCost)
            .ThenBy(candidatePoint => candidatePoint.Id)
            .Select(ToResponse)
            .ToList();

        var message = response.Count == 0
            ? "Seçilen filtrelere uygun, hesaplaması tamamlanmış gerçek aday nokta bulunamadı."
            : $"{response.Count} gerçek aday nokta getirildi.";

        return ApiResponse<IReadOnlyList<CandidatePointResponse>>.Ok(response, message);
    }

    internal static CandidatePointResponse ToResponse(CandidatePoint candidatePoint)
    {
        return new CandidatePointResponse(
            candidatePoint.Id,
            candidatePoint.Name,
            candidatePoint.EstimatedAddress,
            candidatePoint.RegionId,
            candidatePoint.Region,
            candidatePoint.NeighborhoodId,
            candidatePoint.Neighborhood,
            candidatePoint.EstimatedCost,
            candidatePoint.CostScore,
            candidatePoint.DemandScore,
            candidatePoint.GeneralScore,
            candidatePoint.Latitude,
            candidatePoint.Longitude,
            candidatePoint.SystemType,
            candidatePoint.PlaceType,
            candidatePoint.Status,
            candidatePoint.AlgorithmVersion,
            candidatePoint.CalculatedAtUtc);
    }

    private static bool HasCompleteCalculation(CandidatePoint candidatePoint)
    {
        return candidatePoint.Location is not null &&
            candidatePoint.EstimatedCost.HasValue &&
            candidatePoint.CostScore.HasValue &&
            candidatePoint.DemandScore.HasValue &&
            candidatePoint.GeneralScore.HasValue &&
            candidatePoint.CostScore is >= 0 and <= 100 &&
            candidatePoint.DemandScore is >= 0 and <= 100 &&
            candidatePoint.GeneralScore is >= 0 and <= 100;
    }

    private static IEnumerable<CandidatePoint> ApplyScoreRange(
        IEnumerable<CandidatePoint> source,
        Func<CandidatePoint, int?> selector,
        int? minimum,
        int? maximum)
    {
        if (minimum.HasValue)
        {
            source = source.Where(candidatePoint =>
            {
                var value = selector(candidatePoint);
                return value.HasValue && value.Value >= minimum.Value;
            });
        }

        if (maximum.HasValue)
        {
            source = source.Where(candidatePoint =>
            {
                var value = selector(candidatePoint);
                return value.HasValue && value.Value <= maximum.Value;
            });
        }

        return source;
    }
}
