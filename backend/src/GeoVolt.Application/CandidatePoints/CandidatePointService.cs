using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Application.CostEstimations.Abstractions;
using GeoVolt.Application.CostEstimations.Dtos;
using GeoVolt.Domain.Entities;
using GeoVolt.Domain.Constants;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using NetTopologySuite.Geometries;
using System.Text.Json;

namespace GeoVolt.Application.CandidatePoints;

public sealed class CandidatePointService : ICandidatePointService
{
    private const decimal SystemCandidateMinimumScore = 75m;

    private readonly ICandidatePointRepository _candidatePointRepository;
    private readonly ISuitabilityAnalysisService _suitabilityAnalysisService;
    private readonly ICostConfigurationRepository _costConfigurationRepository;
    private readonly ICostEstimationService _costEstimationService;

    public CandidatePointService(
        ICandidatePointRepository candidatePointRepository,
        ISuitabilityAnalysisService suitabilityAnalysisService,
        ICostConfigurationRepository costConfigurationRepository,
        ICostEstimationService costEstimationService)
    {
        _candidatePointRepository = candidatePointRepository;
        _suitabilityAnalysisService = suitabilityAnalysisService;
        _costConfigurationRepository = costConfigurationRepository;
        _costEstimationService = costEstimationService;
    }

    public async Task<ApiResponse<IReadOnlyList<CandidatePointResponse>>> GetCandidatePointsAsync(
        CandidatePointQuery query,
        CancellationToken cancellationToken)
    {
        var candidatePoints = await _candidatePointRepository.GetCandidatePointsAsync(query, cancellationToken);
        var response = candidatePoints.Select(ToResponse).ToList();

        var message = response.Count == 0
            ? "Seçilen filtrelere uygun, hesaplaması tamamlanmış aday nokta bulunamadı."
            : $"{response.Count} aday nokta getirildi.";

        return ApiResponse<IReadOnlyList<CandidatePointResponse>>.Ok(response, message);
    }

    public async Task<ApiResponse<CandidatePointResponse>> CreateAsync(
        CreateCandidatePointRequest request,
        CancellationToken cancellationToken)
    {
        var candidatePoint = new CandidatePoint();
        Apply(candidatePoint, request);

        var created = await _candidatePointRepository.AddAsync(candidatePoint, cancellationToken);

        return ApiResponse<CandidatePointResponse>.Ok(ToResponse(created), "Aday nokta oluşturuldu.");
    }

    public async Task<ApiResponse<CandidatePointResponse>> UpdateAsync(
        int id,
        UpdateCandidatePointRequest request,
        CancellationToken cancellationToken)
    {
        var candidatePoint = await _candidatePointRepository.GetCandidatePointByIdAsync(id, cancellationToken);

        if (candidatePoint is null)
        {
            return ApiResponse<CandidatePointResponse>.Fail("Aday nokta bulunamadı.");
        }

        Apply(candidatePoint, request);
        var updated = await _candidatePointRepository.UpdateAsync(candidatePoint, cancellationToken);

        return ApiResponse<CandidatePointResponse>.Ok(ToResponse(updated), "Aday nokta güncellendi.");
    }

    public async Task<ApiResponse<int>> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var candidatePoint = await _candidatePointRepository.GetCandidatePointByIdAsync(id, cancellationToken);

        if (candidatePoint is null)
        {
            return ApiResponse<int>.Fail("Aday nokta bulunamadı.");
        }

        await _candidatePointRepository.DeleteAsync(candidatePoint, cancellationToken);

        return ApiResponse<int>.Ok(id, "Aday nokta silindi.");
    }

    public async Task<ApiResponse<CandidatePointPromotionResult>> PromoteSuitabilityCellAsync(
        int analysisRunId,
        long cellId,
        int createdByUserId,
        CancellationToken cancellationToken)
    {
        var cell = await _candidatePointRepository.GetSuitabilityCellAsync(
            analysisRunId,
            cellId,
            cancellationToken);

        if (cell is null)
        {
            return ApiResponse<CandidatePointPromotionResult>.Fail("Analiz hücresi bulunamadı.");
        }

        if (!cell.SuitabilityScore.HasValue)
        {
            return ApiResponse<CandidatePointPromotionResult>.Fail("Bu hücrenin uygunluk puanı henüz hesaplanmamış.");
        }

        if (cell.HasHardExclusion)
        {
            return ApiResponse<CandidatePointPromotionResult>.Fail("Kesin engel bulunan hücre aday noktaya dönüştürülemez.");
        }

        if (cell.SuitabilityScore < SystemCandidateMinimumScore || !IsProvisionalRecommendation(cell))
        {
            return ApiResponse<CandidatePointPromotionResult>.Fail(
                $"Yalnızca {SystemCandidateMinimumScore:0}+ puanlı ve sistem tarafından önerilen hücreler aday noktaya dönüştürülebilir.");
        }

        if (cell.AnalysisRun.GridEdgeMeters != SuitabilityGridDefaults.EdgeMeters)
        {
            return ApiResponse<CandidatePointPromotionResult>.Fail(
                $"Aday noktalar yalnızca sabit {SuitabilityGridDefaults.EdgeMeters} metrelik hexagon evreninden oluşturulabilir.");
        }

        var canonicalCell = await _candidatePointRepository.GetCanonicalSuitabilityCellAsync(
            cell.AnalysisRun.StudyAreaDistrictId,
            SuitabilityGridDefaults.EdgeMeters,
            cell.CellI,
            cell.CellJ,
            cancellationToken);

        if (canonicalCell is null)
        {
            return ApiResponse<CandidatePointPromotionResult>.Fail("Sabit aday hexagonu bulunamadı.");
        }

        var existing = await _candidatePointRepository.GetBySourceSuitabilityCellIdAsync(
            canonicalCell.Id,
            cancellationToken);

        if (existing is not null)
        {
            return ApiResponse<CandidatePointPromotionResult>.Ok(
                new CandidatePointPromotionResult(false, ToResponse(existing)),
                "Bu sabit hexagon daha önce aday noktaya dönüştürülmüş.");
        }

        var systemCandidates = await _candidatePointRepository.GetCandidatePointsAsync(
            new CandidatePointQuery(
                SourceType: CandidatePointSourceTypes.SystemAnalysis,
                IncludeIncomplete: true),
            cancellationToken);
        var locationKey = CreateLocationKey(canonicalCell.RepresentativePoint);
        var existingAtLocation = systemCandidates.FirstOrDefault(candidate =>
            candidate.Location is not null && CreateLocationKey(candidate.Location) == locationKey);

        if (existingAtLocation is not null)
        {
            return ApiResponse<CandidatePointPromotionResult>.Ok(
                new CandidatePointPromotionResult(false, ToResponse(existingAtLocation)),
                "Bu konum daha önce başka bir analizden aday noktaya dönüştürülmüş.");
        }

        var costConfiguration = await LoadBaselineCostConfigurationAsync(cancellationToken);
        var candidatePoint = await CreateSystemCandidateAsync(
            cell,
            canonicalCell,
            createdByUserId,
            costConfiguration,
            cancellationToken);
        ApplyRelativeCandidateScores([candidatePoint]);

        var created = await _candidatePointRepository.AddAsync(candidatePoint, cancellationToken);

        return ApiResponse<CandidatePointPromotionResult>.Ok(
            new CandidatePointPromotionResult(true, ToResponse(created)),
            "Analiz hücresi sistem adayına dönüştürüldü.");
    }

    public async Task<ApiResponse<BulkCandidatePointPromotionResult>> PromoteRecommendedSuitabilityCellsAsync(
        int analysisRunId,
        int createdByUserId,
        CancellationToken cancellationToken)
    {
        if (!await _candidatePointRepository.SuitabilityAnalysisRunExistsAsync(
            analysisRunId,
            cancellationToken))
        {
            return ApiResponse<BulkCandidatePointPromotionResult>.Fail("Analiz çalışması bulunamadı.");
        }

        var gridEdgeMeters = await _candidatePointRepository.GetSuitabilityAnalysisRunGridEdgeMetersAsync(
            analysisRunId,
            cancellationToken);

        if (gridEdgeMeters != SuitabilityGridDefaults.EdgeMeters)
        {
            return ApiResponse<BulkCandidatePointPromotionResult>.Fail(
                $"Bu çalışma eski/değişken grid yapısını kullanıyor. Yalnızca sabit {SuitabilityGridDefaults.EdgeMeters} metrelik aday evreni aktarılabilir.");
        }

        var scoredCells = await _candidatePointRepository.GetSuitabilityCellsForPromotionAsync(
            analysisRunId,
            SystemCandidateMinimumScore,
            cancellationToken);
        var eligibleCells = scoredCells.Where(IsProvisionalRecommendation).ToList();
        var studyAreaDistrictId = eligibleCells.FirstOrDefault()?.AnalysisRun.StudyAreaDistrictId;

        if (!studyAreaDistrictId.HasValue)
        {
            return ApiResponse<BulkCandidatePointPromotionResult>.Ok(
                new BulkCandidatePointPromotionResult(
                    analysisRunId,
                    SystemCandidateMinimumScore,
                    0,
                    0,
                    0),
                "Aday kriterlerini karşılayan sabit hexagon bulunamadı.");
        }

        var canonicalCells = await _candidatePointRepository.GetCanonicalSuitabilityCellsAsync(
            studyAreaDistrictId.Value,
            SuitabilityGridDefaults.EdgeMeters,
            cancellationToken);
        var canonicalCellMap = canonicalCells.ToDictionary(cell => (cell.CellI, cell.CellJ));
        var eligiblePairs = eligibleCells
            .Where(cell => canonicalCellMap.ContainsKey((cell.CellI, cell.CellJ)))
            .Select(cell => (Source: cell, Canonical: canonicalCellMap[(cell.CellI, cell.CellJ)]))
            .ToList();
        var existingIds = await _candidatePointRepository.GetExistingSourceSuitabilityCellIdsAsync(
            eligiblePairs.Select(pair => pair.Canonical.Id).ToArray(),
            cancellationToken);
        var existingSystemCandidates = await _candidatePointRepository.GetCandidatePointsAsync(
            new CandidatePointQuery(
                SourceType: CandidatePointSourceTypes.SystemAnalysis,
                IncludeIncomplete: true),
            cancellationToken);
        var existingByCellId = existingSystemCandidates
            .Where(candidate => candidate.SourceSuitabilityCellId.HasValue)
            .GroupBy(candidate => candidate.SourceSuitabilityCellId!.Value)
            .ToDictionary(group => group.Key, group => group.First());
        var existingByLocation = existingSystemCandidates
            .Where(candidate => candidate.Location is not null)
            .GroupBy(candidate => CreateLocationKey(candidate.Location!))
            .ToDictionary(group => group.Key, group => group.First());
        var candidates = new List<CandidatePoint>();
        var refreshedCandidates = new List<CandidatePoint>();
        var scoredCandidates = new List<CandidatePoint>();
        var refreshedCandidateIds = new HashSet<int>();
        var costConfiguration = await LoadBaselineCostConfigurationAsync(cancellationToken);

        foreach (var pair in eligiblePairs)
        {
            var locationKey = CreateLocationKey(pair.Canonical.RepresentativePoint);
            existingByCellId.TryGetValue(pair.Canonical.Id, out var existingCandidate);
            existingCandidate ??= existingByLocation.GetValueOrDefault(locationKey);

            var refreshed = await CreateSystemCandidateAsync(
                pair.Source,
                pair.Canonical,
                createdByUserId,
                costConfiguration,
                cancellationToken);

            if (existingCandidate is not null || existingIds.Contains(pair.Canonical.Id))
            {
                if (existingCandidate is not null
                    && refreshedCandidateIds.Add(existingCandidate.Id))
                {
                    ApplySystemAnalysis(existingCandidate, refreshed);
                    refreshedCandidates.Add(existingCandidate);
                    scoredCandidates.Add(existingCandidate);
                }

                continue;
            }

            candidates.Add(refreshed);
            scoredCandidates.Add(refreshed);
            existingByCellId[pair.Canonical.Id] = refreshed;
            existingByLocation[locationKey] = refreshed;
        }

        ApplyRelativeCandidateScores(scoredCandidates);
        await _candidatePointRepository.UpdateRangeAsync(refreshedCandidates, cancellationToken);
        await _candidatePointRepository.AddRangeAsync(candidates, cancellationToken);

        var result = new BulkCandidatePointPromotionResult(
            analysisRunId,
            SystemCandidateMinimumScore,
            eligiblePairs.Count,
            candidates.Count,
            eligiblePairs.Count - candidates.Count);

        return ApiResponse<BulkCandidatePointPromotionResult>.Ok(
            result,
            candidates.Count > 0 || refreshedCandidates.Count > 0
                ? $"{candidates.Count} yeni sistem önerisi eklendi, {refreshedCandidates.Count} mevcut aday güncellendi."
                : "Eklenebilecek veya güncellenecek sistem önerisi bulunamadı.");
    }

    public async Task<ApiResponse<CandidatePointResponse>> CreateUserManualAsync(
        CreateUserManualCandidateRequest request,
        int createdByUserId,
        CancellationToken cancellationToken)
    {
        var evaluation = await _suitabilityAnalysisService.EvaluateLocationAsync(
            new EvaluateSuitabilityLocationRequest
            {
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                RecommendationLimit = 1
            },
            cancellationToken);

        var cell = evaluation.SelectedCell;
        if (!evaluation.IsInsideStudyArea || cell is null)
        {
            return ApiResponse<CandidatePointResponse>.Fail(
                "Seçilen nokta çalışma alanında değerlendirilemedi.");
        }

        if (cell.HasHardExclusion)
        {
            return ApiResponse<CandidatePointResponse>.Fail(
                "Kesin engel bulunan konum kullanıcı adayına dönüştürülemez.");
        }

        if (!cell.SuitabilityScore.HasValue)
        {
            return ApiResponse<CandidatePointResponse>.Fail(
                "Seçilen konumun uygunluk puanı henüz hesaplanmamış.");
        }

        var regionName = cell.RegionName ?? evaluation.DistrictName ?? string.Empty;
        var neighborhoodName = cell.NeighborhoodName ?? string.Empty;
        var defaultName = string.IsNullOrWhiteSpace(neighborhoodName)
            ? "Kullanıcı Manuel Adayı"
            : $"Kullanıcı Adayı - {neighborhoodName}";
        var score = Math.Clamp((int)Math.Round(cell.SuitabilityScore.Value), 0, 100);
        var candidatePoint = new CandidatePoint
        {
            Name = string.IsNullOrWhiteSpace(request.Name) ? defaultName : request.Name.Trim(),
            EstimatedAddress = string.Join(" / ", new[] { regionName, neighborhoodName }
                .Where(value => !string.IsNullOrWhiteSpace(value))),
            Region = regionName,
            Neighborhood = neighborhoodName,
            GeneralScore = score,
            Location = CreatePoint(request.Latitude, request.Longitude),
            RegionId = cell.RegionId,
            NeighborhoodId = cell.NeighborhoodId,
            NearestTransformerMeters = cell.Metrics.NearestTransformerMeters,
            NearestMajorRoadMeters = cell.Metrics.NearestMajorRoadMeters,
            NearestStationMeters = cell.Metrics.NearestStationMeters,
            PoiCount300Meters = cell.Metrics.PoiCount300Meters,
            PoiCount500Meters = cell.Metrics.PoiCount500Meters,
            PoiCount1000Meters = cell.Metrics.PoiCount1000Meters,
            SuitabilityPercent = (double)cell.SuitabilityScore.Value,
            AlgorithmVersion = "user-manual-analysis-v1",
            CalculatedAtUtc = DateTime.UtcNow,
            PlaceType = "Kullanıcı Manuel Noktası",
            Status = "Draft",
            SourceType = CandidatePointSourceTypes.UserManual,
            CreatedByUserId = createdByUserId,
            SourceAnalysisRunId = evaluation.AnalysisRunId,
            SourceSuitabilityCellId = null,
            CreatedAtUtc = DateTime.UtcNow
        };

        var created = await _candidatePointRepository.AddAsync(candidatePoint, cancellationToken);
        return ApiResponse<CandidatePointResponse>.Ok(
            ToResponse(created),
            "Seçilen konum kullanıcı adayı olarak kaydedildi.");
    }

    private async Task<CandidatePoint> CreateSystemCandidateAsync(
        SuitabilityCell sourceCell,
        SuitabilityCell canonicalCell,
        int createdByUserId,
        BaselineCostConfiguration? costConfiguration,
        CancellationToken cancellationToken)
    {
        var score = Math.Clamp((int)Math.Round(sourceCell.SuitabilityScore!.Value), 0, 100);
        var regionName = canonicalCell.Region?.Name ?? sourceCell.Region?.Name ?? string.Empty;
        var neighborhoodName = canonicalCell.Neighborhood?.Name ?? sourceCell.Neighborhood?.Name ?? string.Empty;
        var estimatedCost = await CalculateBaselineCostAsync(
            sourceCell,
            costConfiguration,
            cancellationToken);

        return new CandidatePoint
        {
            Name = string.IsNullOrWhiteSpace(neighborhoodName)
                ? $"Sistem Adayı - Hexagon {canonicalCell.Id}"
                : $"Sistem Adayı - {neighborhoodName}",
            EstimatedAddress = string.Join(" / ", new[] { regionName, neighborhoodName }
                .Where(value => !string.IsNullOrWhiteSpace(value))),
            Region = regionName,
            Neighborhood = neighborhoodName,
            EstimatedCost = estimatedCost ?? sourceCell.EstimatedCost,
            GeneralScore = score,
            Location = new Point(canonicalCell.RepresentativePoint.X, canonicalCell.RepresentativePoint.Y) { SRID = 4326 },
            RegionId = canonicalCell.Region?.SourceId ?? sourceCell.Region?.SourceId,
            NeighborhoodId = canonicalCell.Neighborhood?.SourceId ?? sourceCell.Neighborhood?.SourceId,
            NearestTransformerMeters = sourceCell.NearestTransformerMeters,
            NearestMajorRoadMeters = sourceCell.NearestMajorRoadMeters,
            NearestStationMeters = sourceCell.NearestStationMeters,
            PoiCount300Meters = sourceCell.PoiCount300Meters,
            PoiCount500Meters = sourceCell.PoiCount500Meters,
            PoiCount1000Meters = sourceCell.PoiCount1000Meters,
            Population = ToNullableInt(sourceCell.PopulationDensityPerSquareKilometer),
            SuitabilityPercent = (double)sourceCell.SuitabilityScore.Value,
            AlgorithmVersion = CandidatePointAlgorithmVersions.CanonicalGrid200Meters,
            CalculatedAtUtc = sourceCell.CalculatedAtUtc,
            SystemType = "AC",
            PlaceType = "Sabit Aday Hexagonu",
            Status = "Draft",
            SourceType = CandidatePointSourceTypes.SystemAnalysis,
            CreatedByUserId = createdByUserId,
            SourceAnalysisRunId = sourceCell.AnalysisRunId,
            SourceSuitabilityCellId = canonicalCell.Id,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    private async Task<BaselineCostConfiguration?> LoadBaselineCostConfigurationAsync(
        CancellationToken cancellationToken)
    {
        const string systemType = "AC";
        const int powerKw = 22;
        const string venueType = "Workplace";

        var modelSetting = await _costConfigurationRepository.GetModelSettingAsync(cancellationToken);
        var costProfile = await _costConfigurationRepository.GetProfileAsync(
            systemType,
            powerKw,
            cancellationToken);
        var venueMultiplier = await _costConfigurationRepository.GetVenueMultiplierAsync(
            venueType,
            cancellationToken);

        return modelSetting is null || costProfile is null || venueMultiplier is null
            ? null
            : new BaselineCostConfiguration(modelSetting, costProfile, venueMultiplier);
    }

    private static void ApplySystemAnalysis(
        CandidatePoint target,
        CandidatePoint source)
    {
        target.Name = source.Name;
        target.EstimatedAddress = source.EstimatedAddress;
        target.Region = source.Region;
        target.Neighborhood = source.Neighborhood;
        target.EstimatedCost = source.EstimatedCost;
        target.GeneralScore = source.GeneralScore;
        target.Location = source.Location;
        target.RegionId = source.RegionId;
        target.NeighborhoodId = source.NeighborhoodId;
        target.NearestTransformerMeters = source.NearestTransformerMeters;
        target.NearestMajorRoadMeters = source.NearestMajorRoadMeters;
        target.NearestStationMeters = source.NearestStationMeters;
        target.PoiCount300Meters = source.PoiCount300Meters;
        target.PoiCount500Meters = source.PoiCount500Meters;
        target.PoiCount1000Meters = source.PoiCount1000Meters;
        target.Population = source.Population;
        target.SuitabilityPercent = source.SuitabilityPercent;
        target.AlgorithmVersion = source.AlgorithmVersion;
        target.CalculatedAtUtc = source.CalculatedAtUtc;
        target.SystemType = source.SystemType;
        target.PlaceType = source.PlaceType;
        target.Status = source.Status;
        target.SourceType = source.SourceType;
        target.SourceAnalysisRunId = source.SourceAnalysisRunId;
        target.SourceSuitabilityCellId = source.SourceSuitabilityCellId;
    }

    private async Task<decimal?> CalculateBaselineCostAsync(
        SuitabilityCell cell,
        BaselineCostConfiguration? configuration,
        CancellationToken cancellationToken)
    {
        if (configuration is null
            || !cell.NearestTransformerMeters.HasValue
            || !cell.SlopePercent.HasValue)
        {
            return null;
        }

        var slopeBand = await _costConfigurationRepository.GetSlopeBandAsync(
            cell.SlopePercent.Value,
            cancellationToken);

        if (slopeBand is null)
        {
            return null;
        }

        var input = new CostEstimationInputDto
        {
            DistanceToTransformerMeters = cell.NearestTransformerMeters.Value,
            SlopePercent = (double)cell.SlopePercent.Value,
            ConnectorCount = 1,
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

    private static void ApplyRelativeCandidateScores(IReadOnlyList<CandidatePoint> candidates)
    {
        var costScores = BuildPercentileScores(
            candidates,
            candidate => candidate.EstimatedCost.HasValue
                ? (double)candidate.EstimatedCost.Value
                : null,
            lowerValueIsBetter: true);
        var poiScores = BuildPercentileScores(
            candidates,
            candidate => candidate.PoiCount500Meters,
            lowerValueIsBetter: false);
        var populationScores = BuildPercentileScores(
            candidates,
            candidate => candidate.Population,
            lowerValueIsBetter: false);

        foreach (var candidate in candidates)
        {
            candidate.CostScore = costScores.GetValueOrDefault(candidate);

            var poiScore = poiScores.GetValueOrDefault(
                candidate,
                candidate.GeneralScore ?? 0);
            var populationScore = populationScores.GetValueOrDefault(
                candidate,
                poiScore);
            candidate.DemandScore = Math.Clamp(
                (int)Math.Round(
                    poiScore * 0.60d + populationScore * 0.40d,
                    MidpointRounding.AwayFromZero),
                0,
                100);
        }
    }

    private static Dictionary<CandidatePoint, int> BuildPercentileScores(
        IReadOnlyList<CandidatePoint> candidates,
        Func<CandidatePoint, double?> selector,
        bool lowerValueIsBetter)
    {
        var ordered = candidates
            .Select(candidate => new { Candidate = candidate, Value = selector(candidate) })
            .Where(item => item.Value.HasValue && double.IsFinite(item.Value.Value))
            .OrderBy(item => item.Value)
            .ToList();
        var result = new Dictionary<CandidatePoint, int>();

        for (var index = 0; index < ordered.Count; index++)
        {
            var percentile = ordered.Count == 1
                ? 100d
                : index * 100d / (ordered.Count - 1);
            var score = lowerValueIsBetter ? 100d - percentile : percentile;
            result[ordered[index].Candidate] = Math.Clamp(
                (int)Math.Round(score, MidpointRounding.AwayFromZero),
                0,
                100);
        }

        return result;
    }

    private static int? ToNullableInt(double? value)
    {
        if (!value.HasValue || !double.IsFinite(value.Value))
        {
            return null;
        }

        return (int)Math.Clamp(
            Math.Round(value.Value, MidpointRounding.AwayFromZero),
            int.MinValue,
            int.MaxValue);
    }

    private sealed record BaselineCostConfiguration(
        CostModelSetting ModelSetting,
        CostProfile CostProfile,
        VenueCostMultiplier VenueMultiplier);

    private static bool IsProvisionalRecommendation(SuitabilityCell cell)
    {
        try
        {
            using var document = JsonDocument.Parse(cell.MetricDetailsJson);
            return document.RootElement.TryGetProperty("scoring", out var scoring)
                && scoring.TryGetProperty("provisionalRecommendation", out var recommendation)
                && recommendation.ValueKind is JsonValueKind.True;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static (long Longitude, long Latitude) CreateLocationKey(Point point)
    {
        const double coordinateScale = 1_000_000d;
        return (
            (long)Math.Round(point.X * coordinateScale),
            (long)Math.Round(point.Y * coordinateScale));
    }

    private static void Apply(CandidatePoint candidatePoint, CreateCandidatePointRequest request)
    {
        candidatePoint.Name = request.Name.Trim();
        candidatePoint.EstimatedAddress = Normalize(request.EstimatedAddress);
        candidatePoint.Region = Normalize(request.Region);
        candidatePoint.Neighborhood = Normalize(request.Neighborhood);
        candidatePoint.EstimatedCost = request.EstimatedCost;
        candidatePoint.CostScore = request.CostScore;
        candidatePoint.DemandScore = request.DemandScore;
        candidatePoint.GeneralScore = request.GeneralScore;
        candidatePoint.Location = CreatePoint(request.Latitude, request.Longitude);
        candidatePoint.RegionId = request.RegionId;
        candidatePoint.NeighborhoodId = request.NeighborhoodId;
        candidatePoint.SystemType = Normalize(request.SystemType);
        candidatePoint.PlaceType = Normalize(request.PlaceType);
        candidatePoint.Status = NormalizeStatus(request.Status);
        candidatePoint.SourceType = CandidatePointSourceTypes.AdminManual;
        candidatePoint.AlgorithmVersion = "manual-v1";
        candidatePoint.CalculatedAtUtc = DateTime.UtcNow;
    }

    private static void Apply(CandidatePoint candidatePoint, UpdateCandidatePointRequest request)
    {
        candidatePoint.Name = request.Name.Trim();
        candidatePoint.EstimatedAddress = Normalize(request.EstimatedAddress);
        candidatePoint.Region = Normalize(request.Region);
        candidatePoint.Neighborhood = Normalize(request.Neighborhood);
        candidatePoint.EstimatedCost = request.EstimatedCost;
        candidatePoint.CostScore = request.CostScore;
        candidatePoint.DemandScore = request.DemandScore;
        candidatePoint.GeneralScore = request.GeneralScore;
        candidatePoint.Location = CreatePoint(request.Latitude, request.Longitude);
        candidatePoint.RegionId = request.RegionId;
        candidatePoint.NeighborhoodId = request.NeighborhoodId;
        candidatePoint.SystemType = Normalize(request.SystemType);
        candidatePoint.PlaceType = Normalize(request.PlaceType);
        candidatePoint.Status = NormalizeStatus(request.Status);
        candidatePoint.CalculatedAtUtc = DateTime.UtcNow;
    }

    private static Point CreatePoint(double latitude, double longitude)
    {
        return new Point(longitude, latitude) { SRID = 4326 };
    }

    private static string Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

    private static string NormalizeStatus(string? value) => string.IsNullOrWhiteSpace(value) ? "Draft" : value.Trim();

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
            candidatePoint.SourceType,
            candidatePoint.CreatedByUserId,
            candidatePoint.SourceAnalysisRunId,
            candidatePoint.SourceSuitabilityCellId,
            candidatePoint.CreatedAtUtc,
            candidatePoint.AlgorithmVersion,
            candidatePoint.CalculatedAtUtc);
    }
}
