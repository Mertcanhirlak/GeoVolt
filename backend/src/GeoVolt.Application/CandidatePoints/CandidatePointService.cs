using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
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

    public CandidatePointService(
        ICandidatePointRepository candidatePointRepository,
        ISuitabilityAnalysisService suitabilityAnalysisService)
    {
        _candidatePointRepository = candidatePointRepository;
        _suitabilityAnalysisService = suitabilityAnalysisService;
    }

    public async Task<ApiResponse<IReadOnlyList<CandidatePointResponse>>> GetCandidatePointsAsync(
        CandidatePointQuery query,
        CancellationToken cancellationToken)
    {
        var candidatePoints = await _candidatePointRepository.GetCandidatePointsAsync(query, cancellationToken);
        var response = candidatePoints.Select(ToResponse).ToList();

        return ApiResponse<IReadOnlyList<CandidatePointResponse>>.Ok(response);
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
            new CandidatePointQuery(SourceType: CandidatePointSourceTypes.SystemAnalysis),
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

        var candidatePoint = CreateSystemCandidate(cell, canonicalCell, createdByUserId);

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
            new CandidatePointQuery(SourceType: CandidatePointSourceTypes.SystemAnalysis),
            cancellationToken);
        var occupiedLocations = existingSystemCandidates
            .Where(candidate => candidate.Location is not null)
            .Select(candidate => CreateLocationKey(candidate.Location!))
            .ToHashSet();
        var candidates = new List<CandidatePoint>();

        foreach (var pair in eligiblePairs)
        {
            if (existingIds.Contains(pair.Canonical.Id)
                || !occupiedLocations.Add(CreateLocationKey(pair.Canonical.RepresentativePoint)))
            {
                continue;
            }

            candidates.Add(CreateSystemCandidate(pair.Source, pair.Canonical, createdByUserId));
        }

        await _candidatePointRepository.AddRangeAsync(candidates, cancellationToken);

        var result = new BulkCandidatePointPromotionResult(
            analysisRunId,
            SystemCandidateMinimumScore,
            eligiblePairs.Count,
            candidates.Count,
            eligiblePairs.Count - candidates.Count);

        return ApiResponse<BulkCandidatePointPromotionResult>.Ok(
            result,
            candidates.Count > 0
                ? $"{candidates.Count} sistem önerisi aday noktalara eklendi."
                : "Eklenebilecek yeni sistem önerisi bulunamadı.");
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

    private static CandidatePoint CreateSystemCandidate(
        SuitabilityCell sourceCell,
        SuitabilityCell canonicalCell,
        int createdByUserId)
    {
        var score = Math.Clamp((int)Math.Round(sourceCell.SuitabilityScore!.Value), 0, 100);
        var regionName = canonicalCell.Region?.Name ?? sourceCell.Region?.Name ?? string.Empty;
        var neighborhoodName = canonicalCell.Neighborhood?.Name ?? sourceCell.Neighborhood?.Name ?? string.Empty;

        return new CandidatePoint
        {
            Name = string.IsNullOrWhiteSpace(neighborhoodName)
                ? $"Sistem Adayı - Hexagon {canonicalCell.Id}"
                : $"Sistem Adayı - {neighborhoodName}",
            EstimatedAddress = string.Join(" / ", new[] { regionName, neighborhoodName }
                .Where(value => !string.IsNullOrWhiteSpace(value))),
            Region = regionName,
            Neighborhood = neighborhoodName,
            EstimatedCost = sourceCell.EstimatedCost,
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
            SuitabilityPercent = (double)sourceCell.SuitabilityScore.Value,
            AlgorithmVersion = CandidatePointAlgorithmVersions.CanonicalGrid200Meters,
            CalculatedAtUtc = sourceCell.CalculatedAtUtc,
            PlaceType = "Sabit Aday Hexagonu",
            Status = "Draft",
            SourceType = CandidatePointSourceTypes.SystemAnalysis,
            CreatedByUserId = createdByUserId,
            SourceAnalysisRunId = sourceCell.AnalysisRunId,
            SourceSuitabilityCellId = canonicalCell.Id,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

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

    private static CandidatePointResponse ToResponse(CandidatePoint candidatePoint)
    {
        return new CandidatePointResponse(
            candidatePoint.Id,
            candidatePoint.Name,
            candidatePoint.EstimatedAddress,
            candidatePoint.Region,
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
            candidatePoint.CreatedAtUtc);
    }
}
