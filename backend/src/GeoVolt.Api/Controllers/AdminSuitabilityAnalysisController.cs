using GeoVolt.Application.Common;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Domain.Constants;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/suitability-analysis")]
public sealed class AdminSuitabilityAnalysisController : ControllerBase
{
    private readonly ISuitabilityAnalysisService _service;
    private readonly ICandidatePointService _candidatePointService;

    public AdminSuitabilityAnalysisController(
        ISuitabilityAnalysisService service,
        ICandidatePointService candidatePointService)
    {
        _service = service;
        _candidatePointService = candidatePointService;
    }

    [HttpPost("districts/{districtSourceId:int}/grid")]
    [Authorize(Policy = PermissionNames.DataImportExecute)]
    [ProducesResponseType(typeof(ApiResponse<SuitabilityGridGenerationResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<SuitabilityGridGenerationResult>>> GenerateGrid(
        int districtSourceId,
        [FromBody] GenerateSuitabilityGridRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.GenerateGridAsync(
            districtSourceId,
            request,
            cancellationToken);

        return Ok(ApiResponse<SuitabilityGridGenerationResult>.Ok(
            result,
            "Uygunluk analiz grid'i oluşturuldu."));
    }

    [HttpPost("regions/{regionSourceId:int}/run")]
    [Authorize(Policy = PermissionNames.DataImportExecute)]
    [Authorize(Policy = PermissionNames.PointCreate)]
    [ProducesResponseType(typeof(ApiResponse<SuitabilityFullAnalysisResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<SuitabilityFullAnalysisResult>>> RunFullAnalysisForRegion(
        int regionSourceId,
        [FromBody] GenerateSuitabilityGridRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.RunFullAnalysisForRegionAsync(
            regionSourceId,
            request,
            cancellationToken);

        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var promotion = await _candidatePointService.PromoteRecommendedSuitabilityCellsAsync(
            result.Scoring.AnalysisRunId,
            userId,
            cancellationToken);
        var message = promotion.Success
            ? $"Bölgesel uygunluk analizi tamamlandı. {promotion.Message}"
            : $"Bölgesel uygunluk analizi tamamlandı; aday aktarımı yapılamadı: {promotion.Message}";

        return Ok(ApiResponse<SuitabilityFullAnalysisResult>.Ok(
            result,
            message));
    }

    [HttpPost("{analysisRunId:int}/metrics")]
    [Authorize(Policy = PermissionNames.DataImportExecute)]
    [ProducesResponseType(typeof(ApiResponse<SuitabilityMetricCalculationResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<SuitabilityMetricCalculationResult>>> CalculateMetrics(
        int analysisRunId,
        CancellationToken cancellationToken)
    {
        var result = await _service.CalculateMetricsAsync(
            analysisRunId,
            cancellationToken);

        return Ok(ApiResponse<SuitabilityMetricCalculationResult>.Ok(
            result,
            "Uygunluk hücre metrikleri hesaplandı."));
    }

    [HttpPost("{analysisRunId:int}/score")]
    [Authorize(Policy = PermissionNames.DataImportExecute)]
    [ProducesResponseType(typeof(ApiResponse<SuitabilityScoringResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<SuitabilityScoringResult>>> CalculateScores(
        int analysisRunId,
        CancellationToken cancellationToken)
    {
        var result = await _service.CalculateScoresAsync(
            analysisRunId,
            cancellationToken);

        return Ok(ApiResponse<SuitabilityScoringResult>.Ok(
            result,
            "Uygunluk puanları hesaplandı."));
    }

    [HttpGet("{analysisRunId:int}/cells")]
    [Authorize(Policy = PermissionNames.DataImportExecute)]
    [ProducesResponseType(typeof(ApiResponse<SuitabilityAnalysisMapResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<SuitabilityAnalysisMapResult>>> GetMapCells(
        int analysisRunId,
        [FromQuery] decimal? minimumScore,
        [FromQuery] string? evaluationStatus,
        [FromQuery] bool onlyRecommended = false,
        [FromQuery] int limit = 5000,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.GetMapCellsAsync(
            analysisRunId,
            minimumScore,
            evaluationStatus,
            onlyRecommended,
            limit,
            cancellationToken);

        return Ok(ApiResponse<SuitabilityAnalysisMapResult>.Ok(
            result,
            "Analiz hücreleri getirildi."));
    }

    [HttpPost("{analysisRunId:int}/cells/{cellId:long}/candidate")]
    [Authorize(Policy = PermissionNames.DataImportExecute)]
    [Authorize(Policy = PermissionNames.PointCreate)]
    [ProducesResponseType(typeof(ApiResponse<CandidatePointPromotionResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<CandidatePointPromotionResult>>> PromoteCellToCandidate(
        int analysisRunId,
        long cellId,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var response = await _candidatePointService.PromoteSuitabilityCellAsync(
            analysisRunId,
            cellId,
            userId,
            cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpPost("{analysisRunId:int}/recommended-candidates")]
    [Authorize(Policy = PermissionNames.DataImportExecute)]
    [Authorize(Policy = PermissionNames.PointCreate)]
    [ProducesResponseType(typeof(ApiResponse<BulkCandidatePointPromotionResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<BulkCandidatePointPromotionResult>>> PromoteRecommendedCellsToCandidates(
        int analysisRunId,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var response = await _candidatePointService.PromoteRecommendedSuitabilityCellsAsync(
            analysisRunId,
            userId,
            cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }
}
