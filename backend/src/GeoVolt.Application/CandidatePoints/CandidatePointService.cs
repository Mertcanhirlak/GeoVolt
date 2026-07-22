using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Entities;
using GeoVolt.Domain.Constants;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using NetTopologySuite.Geometries;

namespace GeoVolt.Application.CandidatePoints;

public sealed class CandidatePointService : ICandidatePointService
{
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
        var existing = await _candidatePointRepository.GetBySourceSuitabilityCellIdAsync(
            cellId,
            cancellationToken);

        if (existing is not null)
        {
            return ApiResponse<CandidatePointPromotionResult>.Ok(
                new CandidatePointPromotionResult(false, ToResponse(existing)),
                "Bu analiz hücresi daha önce aday noktaya dönüştürülmüş.");
        }

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

        var score = Math.Clamp((int)Math.Round(cell.SuitabilityScore.Value), 0, 100);
        var regionName = cell.Region?.Name ?? string.Empty;
        var neighborhoodName = cell.Neighborhood?.Name ?? string.Empty;
        var candidatePoint = new CandidatePoint
        {
            Name = string.IsNullOrWhiteSpace(neighborhoodName)
                ? $"Sistem Adayı - Hücre {cell.Id}"
                : $"Sistem Adayı - {neighborhoodName}",
            EstimatedAddress = string.Join(" / ", new[] { regionName, neighborhoodName }.Where(value => !string.IsNullOrWhiteSpace(value))),
            Region = regionName,
            Neighborhood = neighborhoodName,
            EstimatedCost = cell.EstimatedCost,
            GeneralScore = score,
            EnergyScore = null,
            AccessScore = null,
            Location = new Point(cell.RepresentativePoint.X, cell.RepresentativePoint.Y) { SRID = 4326 },
            RegionId = cell.Region?.SourceId,
            NeighborhoodId = cell.Neighborhood?.SourceId,
            NearestTransformerMeters = cell.NearestTransformerMeters,
            NearestMajorRoadMeters = cell.NearestMajorRoadMeters,
            NearestStationMeters = cell.NearestStationMeters,
            PoiCount300Meters = cell.PoiCount300Meters,
            PoiCount500Meters = cell.PoiCount500Meters,
            PoiCount1000Meters = cell.PoiCount1000Meters,
            Population = null,
            SuitabilityPercent = (double)cell.SuitabilityScore.Value,
            AlgorithmVersion = "analysis-grid-v1",
            CalculatedAtUtc = cell.CalculatedAtUtc,
            SystemType = string.Empty,
            PlaceType = "Analiz Grid Hücresi",
            Status = "Draft",
            SourceType = CandidatePointSourceTypes.SystemAnalysis,
            CreatedByUserId = createdByUserId,
            SourceAnalysisRunId = analysisRunId,
            SourceSuitabilityCellId = cell.Id,
            CreatedAtUtc = DateTime.UtcNow
        };

        var created = await _candidatePointRepository.AddAsync(candidatePoint, cancellationToken);

        return ApiResponse<CandidatePointPromotionResult>.Ok(
            new CandidatePointPromotionResult(true, ToResponse(created)),
            "Analiz hücresi sistem adayına dönüştürüldü.");
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
