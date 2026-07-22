using System.Text.Json;
using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CostEstimations.Abstractions;
using GeoVolt.Application.CostEstimations.Dtos;
using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.CandidatePoints;

public sealed class CandidatePointRepository : ICandidatePointRepository
{
    private const string BaselineSystemType = "AC";
    private const int BaselinePowerKw = 22;
    private const int BaselineConnectorCount = 1;
    private const string BaselineVenueType = "Workplace";
    private const string BaselinePlaceTypeDisplay = "İş Yeri";

    private readonly GeoVoltDbContext _dbContext;
    private readonly ICostEstimationService _costEstimationService;

    public CandidatePointRepository(
        GeoVoltDbContext dbContext,
        ICostEstimationService costEstimationService)
    {
        _dbContext = dbContext;
        _costEstimationService = costEstimationService;
    }

    public async Task<IReadOnlyList<CandidatePoint>> GetCandidatePointsAsync(
        CancellationToken cancellationToken)
    {
        var suitabilityCandidates = await GetSuitabilityCandidatesAsync(cancellationToken);

        if (suitabilityCandidates.Count > 0)
        {
            return suitabilityCandidates;
        }

        var storedCandidates = await _dbContext.CandidatePoints
            .AsNoTracking()
            .OrderByDescending(candidatePoint => candidatePoint.GeneralScore)
            .ThenBy(candidatePoint => candidatePoint.Id)
            .ToListAsync(cancellationToken);

        await EnrichAdministrativeFieldsAsync(storedCandidates, cancellationToken);

        return storedCandidates;
    }

    public async Task<CandidatePoint?> GetCandidatePointByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        if (id > 0)
        {
            var storedCandidate = await _dbContext.CandidatePoints
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    candidatePoint => candidatePoint.Id == id,
                    cancellationToken);

            if (storedCandidate is not null)
            {
                await EnrichAdministrativeFieldsAsync(
                    new[] { storedCandidate },
                    cancellationToken);

                return storedCandidate;
            }
        }

        var suitabilityCandidates = await GetSuitabilityCandidatesAsync(cancellationToken);

        return suitabilityCandidates.FirstOrDefault(candidatePoint => candidatePoint.Id == id);
    }

    private async Task<IReadOnlyList<CandidatePoint>> GetSuitabilityCandidatesAsync(
        CancellationToken cancellationToken)
    {
        var scoredRuns = await _dbContext.SuitabilityAnalysisRuns
            .AsNoTracking()
            .Where(run =>
                run.Status == AnalysisRunStatuses.Scored ||
                run.Status == AnalysisRunStatuses.Completed)
            .OrderByDescending(run => run.CompletedAtUtc ?? run.CreatedAtUtc)
            .ThenByDescending(run => run.Id)
            .ToListAsync(cancellationToken);

        var latestRuns = scoredRuns
            .GroupBy(run => run.StudyAreaDistrictId)
            .Select(group => group.First())
            .ToList();

        if (latestRuns.Count == 0)
        {
            return Array.Empty<CandidatePoint>();
        }

        var runIds = latestRuns.Select(run => run.Id).ToArray();
        var runById = latestRuns.ToDictionary(run => run.Id);

        var finiteSuitabilityCells = _dbContext.SuitabilityCells
            .FromSqlRaw("""
                SELECT cell.*
                FROM analysis.suitability_cells AS cell
                WHERE (
                        cell.suitability_score IS NULL OR
                        cell.suitability_score::text NOT IN ('NaN', 'Infinity', '-Infinity'))
                  AND (
                        cell.confidence_score IS NULL OR
                        cell.confidence_score::text NOT IN ('NaN', 'Infinity', '-Infinity'))
                  AND (
                        cell.slope_percent IS NULL OR
                        cell.slope_percent::text NOT IN ('NaN', 'Infinity', '-Infinity'))
                  AND (
                        cell.estimated_cost IS NULL OR
                        cell.estimated_cost::text NOT IN ('NaN', 'Infinity', '-Infinity'))
                  AND (
                        cell.nearest_transformer_meters IS NULL OR
                        cell.nearest_transformer_meters::text NOT IN ('NaN', 'Infinity', '-Infinity'))
                  AND (
                        cell.nearest_major_road_meters IS NULL OR
                        cell.nearest_major_road_meters::text NOT IN ('NaN', 'Infinity', '-Infinity'))
                  AND (
                        cell.nearest_station_meters IS NULL OR
                        cell.nearest_station_meters::text NOT IN ('NaN', 'Infinity', '-Infinity'))
                  AND (
                        cell.population_density_per_square_kilometer IS NULL OR
                        cell.population_density_per_square_kilometer::text NOT IN ('NaN', 'Infinity', '-Infinity'))
                """);

        var scoredCells = await finiteSuitabilityCells
            .AsNoTracking()
            .Include(cell => cell.Region)
            .Include(cell => cell.Neighborhood)
            .Where(cell =>
                runIds.Contains(cell.AnalysisRunId) &&
                !cell.HasHardExclusion &&
                cell.SuitabilityScore.HasValue &&
                cell.NearestTransformerMeters.HasValue &&
                cell.SlopePercent.HasValue)
            .OrderByDescending(cell => cell.SuitabilityScore)
            .ThenBy(cell => cell.Id)
            .ToListAsync(cancellationToken);

        var candidateCells = scoredCells
            .Where(cell =>
                cell.EvaluationStatus == SiteEvaluationStatuses.Candidate ||
                IsProvisionalRecommendation(cell.MetricDetailsJson))
            .ToList();

        if (candidateCells.Count == 0)
        {
            return Array.Empty<CandidatePoint>();
        }

        var costConfiguration = await LoadBaselineCostConfigurationAsync(cancellationToken);
        var costedCells = candidateCells
            .Select(cell => new CostedCell(
                cell,
                CalculateBaselineCost(cell, costConfiguration)))
            .ToList();

        var result = new List<CandidatePoint>(costedCells.Count);

        foreach (var regionGroup in costedCells.GroupBy(item => item.Cell.RegionId))
        {
            var regionCells = regionGroup
                .OrderByDescending(item => item.Cell.SuitabilityScore)
                .ThenBy(item => item.Cell.Id)
                .ToList();

            var costScores = BuildPercentileScores(
                regionCells,
                item => (double)item.EstimatedCost,
                item => item.Cell.Id,
                lowerValueIsBetter: true);

            var poiScores = BuildPercentileScores(
                regionCells,
                item => item.Cell.PoiCount500Meters,
                item => item.Cell.Id,
                lowerValueIsBetter: false);

            var populationScores = BuildPercentileScores(
                regionCells,
                item => item.Cell.PopulationDensityPerSquareKilometer,
                item => item.Cell.Id,
                lowerValueIsBetter: false);

            var transformerScores = BuildPercentileScores(
                regionCells,
                item => item.Cell.NearestTransformerMeters,
                item => item.Cell.Id,
                lowerValueIsBetter: true);

            var roadScores = BuildPercentileScores(
                regionCells,
                item => item.Cell.NearestMajorRoadMeters,
                item => item.Cell.Id,
                lowerValueIsBetter: true);

            for (var index = 0; index < regionCells.Count; index++)
            {
                var item = regionCells[index];
                var cell = item.Cell;
                var regionName = cell.Region?.Name?.Trim();
                var neighborhoodName = cell.Neighborhood?.Name?.Trim();

                if (string.IsNullOrWhiteSpace(regionName))
                {
                    regionName = "Bölge";
                }

                if (string.IsNullOrWhiteSpace(neighborhoodName))
                {
                    neighborhoodName = "Mahalle bilgisi yok";
                }

                var generalScore = RoundScore(cell.SuitabilityScore);
                var costScore = GetScoreOrDefault(costScores, cell.Id, generalScore);
                var poiScore = GetScoreOrDefault(poiScores, cell.Id, generalScore);
                var populationScore = GetScoreOrDefault(populationScores, cell.Id, poiScore);
                var demandScore = ClampScore(
                    (int)Math.Round(
                        poiScore * 0.60d + populationScore * 0.40d,
                        MidpointRounding.AwayFromZero));

                var run = runById[cell.AnalysisRunId];

                result.Add(new CandidatePoint
                {
                    Id = ToGeneratedCandidateId(cell.Id),
                    Name = $"{regionName} Aday Nokta {index + 1}",
                    EstimatedAddress = $"{regionName} / {neighborhoodName}",
                    Region = regionName,
                    Neighborhood = neighborhoodName,
                    EstimatedCost = item.EstimatedCost,
                    CostScore = costScore,
                    DemandScore = demandScore,
                    GeneralScore = generalScore,
                    EnergyScore = GetScoreOrDefault(
                        transformerScores,
                        cell.Id,
                        generalScore),
                    AccessScore = GetScoreOrDefault(
                        roadScores,
                        cell.Id,
                        generalScore),
                    CompetitionPenalty = null,
                    Location = cell.RepresentativePoint,
                    RegionId = cell.Region?.SourceId,
                    NeighborhoodId = cell.Neighborhood?.SourceId,
                    NearestTransformerMeters = cell.NearestTransformerMeters,
                    NearestMajorRoadMeters = cell.NearestMajorRoadMeters,
                    NearestStationMeters = cell.NearestStationMeters,
                    PoiCount300Meters = cell.PoiCount300Meters,
                    PoiCount500Meters = cell.PoiCount500Meters,
                    PoiCount1000Meters = cell.PoiCount1000Meters,
                    Population = ToNullableInt(cell.PopulationDensityPerSquareKilometer),
                    SuitabilityDegree = (double?)cell.SuitabilityScore,
                    SuitabilityPercent = (double?)cell.SuitabilityScore,
                    AlgorithmVersion =
                        $"{run.AlgorithmVersion}-candidate-cell-v2-{BaselineSystemType.ToLowerInvariant()}{BaselinePowerKw}",
                    CalculatedAtUtc = cell.CalculatedAtUtc ?? run.CompletedAtUtc,
                    SystemType = BaselineSystemType,
                    PlaceType = BaselinePlaceTypeDisplay,
                    Status = "ready"
                });
            }
        }

        return result
            .OrderByDescending(candidatePoint => candidatePoint.GeneralScore)
            .ThenByDescending(candidatePoint => candidatePoint.DemandScore)
            .ThenBy(candidatePoint => candidatePoint.EstimatedCost)
            .ThenBy(candidatePoint => candidatePoint.Id)
            .ToList();
    }

    private async Task<BaselineCostConfiguration> LoadBaselineCostConfigurationAsync(
        CancellationToken cancellationToken)
    {
        var modelSetting = await _dbContext.CostModelSettings
            .AsNoTracking()
            .OrderByDescending(setting => setting.UpdatedAtUtc)
            .ThenByDescending(setting => setting.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("Maliyet modeli ayarı bulunamadı.");

        var costProfile = await _dbContext.CostProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(
                profile =>
                    profile.SystemType == BaselineSystemType &&
                    profile.PowerKw == BaselinePowerKw,
                cancellationToken)
            ?? throw new InvalidOperationException(
                $"{BaselineSystemType} {BaselinePowerKw} kW maliyet profili bulunamadı.");

        var venueMultiplier = await _dbContext.VenueCostMultipliers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                multiplier => multiplier.VenueType == BaselineVenueType,
                cancellationToken)
            ?? throw new InvalidOperationException(
                $"{BaselineVenueType} mekân maliyet katsayısı bulunamadı.");

        var slopeBands = await _dbContext.SlopeCostBands
            .AsNoTracking()
            .OrderByDescending(band => band.MinSlopePercent)
            .ToListAsync(cancellationToken);

        if (slopeBands.Count == 0)
        {
            throw new InvalidOperationException("Eğim maliyet bantları bulunamadı.");
        }

        return new BaselineCostConfiguration(
            modelSetting,
            costProfile,
            venueMultiplier,
            slopeBands);
    }

    private decimal CalculateBaselineCost(
        SuitabilityCell cell,
        BaselineCostConfiguration configuration)
    {
        var slopePercent = cell.SlopePercent
            ?? throw new InvalidOperationException(
                $"Uygunluk hücresi {cell.Id} için eğim verisi bulunamadı.");

        var transformerDistance = cell.NearestTransformerMeters
            ?? throw new InvalidOperationException(
                $"Uygunluk hücresi {cell.Id} için trafo mesafesi bulunamadı.");

        var slopeBand = configuration.SlopeBands.FirstOrDefault(band =>
            band.MinSlopePercent <= slopePercent &&
            (!band.MaxSlopePercent.HasValue || slopePercent < band.MaxSlopePercent.Value))
            ?? throw new InvalidOperationException(
                $"{slopePercent} eğim değeri için maliyet bandı bulunamadı.");

        var input = new CostEstimationInputDto
        {
            DistanceToTransformerMeters = transformerDistance,
            SlopePercent = (double)slopePercent,
            ConnectorCount = BaselineConnectorCount,
            CostModelVersion = configuration.ModelSetting.Version,
            CurrencyCode = configuration.ModelSetting.CurrencyCode,
            RouteMultiplier = configuration.ModelSetting.RouteMultiplier,
            RoundingStep = configuration.ModelSetting.RoundingStep,
            EquipmentCost = configuration.CostProfile.EquipmentCost,
            FixedElectricalInfrastructureCost =
                configuration.CostProfile.FixedElectricalInfrastructureCost,
            CableUnitCostPerMeter = configuration.CostProfile.CableUnitCostPerMeter,
            FixedSiteCost = configuration.CostProfile.FixedSiteCost,
            TrenchRestorationUnitCostPerMeter =
                configuration.CostProfile.TrenchRestorationUnitCostPerMeter,
            RiskRate = configuration.CostProfile.RiskRate,
            SlopeExtraRate = slopeBand.ExtraRate,
            VenueMultiplier = configuration.VenueMultiplier.Multiplier
        };

        return _costEstimationService.Calculate(input).EstimatedCost;
    }

    private async Task EnrichAdministrativeFieldsAsync(
        IReadOnlyCollection<CandidatePoint> candidatePoints,
        CancellationToken cancellationToken)
    {
        if (candidatePoints.Count == 0)
        {
            return;
        }

        var regions = await _dbContext.Regions
            .AsNoTracking()
            .OrderBy(region => region.Id)
            .ToListAsync(cancellationToken);

        var neighborhoods = await _dbContext.Neighborhoods
            .AsNoTracking()
            .OrderBy(neighborhood => neighborhood.Id)
            .ToListAsync(cancellationToken);

        var regionByInternalId = regions
            .GroupBy(region => region.Id)
            .ToDictionary(group => group.Key, group => group.First());

        var regionBySourceId = regions
            .GroupBy(region => region.SourceId)
            .ToDictionary(group => group.Key, group => group.First());

        var neighborhoodByInternalId = neighborhoods
            .GroupBy(neighborhood => neighborhood.Id)
            .ToDictionary(group => group.Key, group => group.First());

        var neighborhoodBySourceId = neighborhoods
            .GroupBy(neighborhood => neighborhood.SourceId)
            .ToDictionary(group => group.Key, group => group.First());

        foreach (var candidatePoint in candidatePoints)
        {
            var originalRegionId = candidatePoint.RegionId;
            var originalNeighborhoodId = candidatePoint.NeighborhoodId;

            var region = FindRegion(
                candidatePoint,
                originalRegionId,
                regions,
                regionByInternalId,
                regionBySourceId);

            var neighborhood = FindNeighborhood(
                candidatePoint,
                originalNeighborhoodId,
                region,
                neighborhoods,
                neighborhoodByInternalId,
                neighborhoodBySourceId);

            if (region is not null)
            {
                candidatePoint.RegionId = region.SourceId;
                candidatePoint.Region = region.Name;
            }

            if (neighborhood is not null)
            {
                candidatePoint.NeighborhoodId = neighborhood.SourceId;
                candidatePoint.Neighborhood = neighborhood.Name;
            }

            if (string.IsNullOrWhiteSpace(candidatePoint.EstimatedAddress))
            {
                candidatePoint.EstimatedAddress = string.Join(
                    " / ",
                    new[]
                    {
                        candidatePoint.Region,
                        candidatePoint.Neighborhood
                    }.Where(value => !string.IsNullOrWhiteSpace(value)));
            }

            candidatePoint.Status = HasCompleteCalculation(candidatePoint)
                ? "ready"
                : "missing";
        }
    }

    private static Dictionary<long, int> BuildPercentileScores<T>(
        IReadOnlyCollection<T> items,
        Func<T, double?> valueSelector,
        Func<T, long> keySelector,
        bool lowerValueIsBetter)
    {
        var ordered = items
            .Select(item => new
            {
                Item = item,
                Value = valueSelector(item),
                Key = keySelector(item)
            })
            .Where(item => item.Value.HasValue && double.IsFinite(item.Value.Value))
            .OrderBy(item => item.Value)
            .ThenBy(item => item.Key)
            .ToList();

        var result = new Dictionary<long, int>();

        if (ordered.Count == 0)
        {
            return result;
        }

        if (ordered.Count == 1)
        {
            result[ordered[0].Key] = 100;
            return result;
        }

        for (var index = 0; index < ordered.Count; index++)
        {
            var percentile = index * 100d / (ordered.Count - 1);
            var score = lowerValueIsBetter
                ? 100d - percentile
                : percentile;

            result[ordered[index].Key] = ClampScore(
                (int)Math.Round(score, MidpointRounding.AwayFromZero));
        }

        return result;
    }

    private static Region? FindRegion(
        CandidatePoint candidatePoint,
        int? originalRegionId,
        IReadOnlyList<Region> regions,
        IReadOnlyDictionary<int, Region> regionByInternalId,
        IReadOnlyDictionary<int, Region> regionBySourceId)
    {
        if (originalRegionId.HasValue)
        {
            if (regionByInternalId.TryGetValue(originalRegionId.Value, out var internalRegion))
            {
                return internalRegion;
            }

            if (regionBySourceId.TryGetValue(originalRegionId.Value, out var sourceRegion))
            {
                return sourceRegion;
            }
        }

        if (candidatePoint.Location is not null)
        {
            var spatialRegion = regions.FirstOrDefault(region =>
                region.Boundary.Covers(candidatePoint.Location));

            if (spatialRegion is not null)
            {
                return spatialRegion;
            }
        }

        var normalizedRegionName = NormalizeName(candidatePoint.Region);

        return regions.FirstOrDefault(region =>
            NormalizeName(region.Name) == normalizedRegionName);
    }

    private static Neighborhood? FindNeighborhood(
        CandidatePoint candidatePoint,
        int? originalNeighborhoodId,
        Region? region,
        IReadOnlyList<Neighborhood> neighborhoods,
        IReadOnlyDictionary<int, Neighborhood> neighborhoodByInternalId,
        IReadOnlyDictionary<int, Neighborhood> neighborhoodBySourceId)
    {
        if (originalNeighborhoodId.HasValue)
        {
            if (neighborhoodByInternalId.TryGetValue(
                    originalNeighborhoodId.Value,
                    out var internalNeighborhood))
            {
                return internalNeighborhood;
            }

            if (neighborhoodBySourceId.TryGetValue(
                    originalNeighborhoodId.Value,
                    out var sourceNeighborhood))
            {
                return sourceNeighborhood;
            }
        }

        var regionNeighborhoods = region is null
            ? neighborhoods
            : neighborhoods.Where(neighborhood => neighborhood.RegionId == region.Id).ToList();

        if (candidatePoint.Location is not null)
        {
            var spatialNeighborhood = regionNeighborhoods.FirstOrDefault(neighborhood =>
                neighborhood.Boundary.Covers(candidatePoint.Location));

            if (spatialNeighborhood is not null)
            {
                return spatialNeighborhood;
            }
        }

        var normalizedNeighborhoodName = NormalizeName(candidatePoint.Neighborhood);

        return regionNeighborhoods.FirstOrDefault(neighborhood =>
            NormalizeName(neighborhood.Name) == normalizedNeighborhoodName);
    }

    private static bool IsProvisionalRecommendation(string? metricDetailsJson)
    {
        if (string.IsNullOrWhiteSpace(metricDetailsJson))
        {
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(metricDetailsJson);

            return document.RootElement.TryGetProperty("scoring", out var scoring) &&
                scoring.TryGetProperty("provisionalRecommendation", out var recommendation) &&
                recommendation.ValueKind is JsonValueKind.True;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool HasCompleteCalculation(CandidatePoint candidatePoint)
    {
        return candidatePoint.Location is not null &&
            candidatePoint.EstimatedCost.HasValue &&
            candidatePoint.CostScore.HasValue &&
            candidatePoint.DemandScore.HasValue &&
            candidatePoint.GeneralScore.HasValue;
    }

    private static int GetScoreOrDefault(
        IReadOnlyDictionary<long, int> scores,
        long cellId,
        int defaultValue)
    {
        return scores.TryGetValue(cellId, out var score)
            ? score
            : ClampScore(defaultValue);
    }

    private static int RoundScore(decimal? value)
    {
        return value.HasValue
            ? ClampScore((int)Math.Round(value.Value, MidpointRounding.AwayFromZero))
            : 0;
    }

    private static int ClampScore(int value)
    {
        return Math.Clamp(value, 0, 100);
    }

    private static int ToGeneratedCandidateId(long cellId)
    {
        var normalized = (int)(Math.Abs(cellId) % int.MaxValue);

        if (normalized == 0)
        {
            normalized = int.MaxValue;
        }

        return -normalized;
    }

    private static int? ToNullableInt(double? value)
    {
        if (!value.HasValue || !double.IsFinite(value.Value))
        {
            return null;
        }

        if (value.Value > int.MaxValue)
        {
            return int.MaxValue;
        }

        if (value.Value < int.MinValue)
        {
            return int.MinValue;
        }

        return (int)Math.Round(value.Value, MidpointRounding.AwayFromZero);
    }

    private static string NormalizeName(string? value)
    {
        return string.Concat(
                (value ?? string.Empty)
                    .Trim()
                    .ToUpper(System.Globalization.CultureInfo.GetCultureInfo("tr-TR"))
                    .Normalize(System.Text.NormalizationForm.FormD)
                    .Where(character =>
                        System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character) !=
                        System.Globalization.UnicodeCategory.NonSpacingMark))
            .Replace(" MAHALLESI", string.Empty, StringComparison.Ordinal)
            .Replace(" MAHALLE", string.Empty, StringComparison.Ordinal)
            .Replace(" MAH.", string.Empty, StringComparison.Ordinal)
            .Replace(" MH.", string.Empty, StringComparison.Ordinal)
            .Trim();
    }

    private sealed record BaselineCostConfiguration(
        CostModelSetting ModelSetting,
        CostProfile CostProfile,
        VenueCostMultiplier VenueMultiplier,
        IReadOnlyList<SlopeCostBand> SlopeBands);

    private sealed record CostedCell(
        SuitabilityCell Cell,
        decimal EstimatedCost);
}
