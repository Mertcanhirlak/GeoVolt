using System.Security.Claims;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Application.SavedCandidatePoints.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/saved-candidate-points")]
public sealed class SavedCandidatePointsController : ControllerBase
{
    private readonly ISavedCandidatePointService _savedCandidatePointService;

    public SavedCandidatePointsController(ISavedCandidatePointService savedCandidatePointService)
    {
        _savedCandidatePointService = savedCandidatePointService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CandidatePointResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CandidatePointResponse>>>> GetSavedCandidatePoints(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var candidatePoints = await _savedCandidatePointService.GetSavedCandidatePointsAsync(
            userId,
            cancellationToken);

        return Ok(ApiResponse<IReadOnlyList<CandidatePointResponse>>.Ok(
            candidatePoints,
            "Kaydedilen aday noktalar getirildi."));
    }

    [HttpPost("{candidatePointId:int}")]
    [ProducesResponseType(typeof(ApiResponse<CandidatePointResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CandidatePointResponse>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<CandidatePointResponse>>> SaveCandidatePoint(
        int candidatePointId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var candidatePoint = await _savedCandidatePointService.SaveAsync(
            userId,
            candidatePointId,
            cancellationToken);

        if (candidatePoint is null)
        {
            return NotFound(ApiResponse<CandidatePointResponse>.Fail("Aday nokta bulunamadı."));
        }

        return Ok(ApiResponse<CandidatePointResponse>.Ok(
            candidatePoint,
            "Aday nokta kaydedildi."));
    }

    [HttpDelete("{candidatePointId:int}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteSavedCandidatePoint(
        int candidatePointId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var deleted = await _savedCandidatePointService.DeleteAsync(
            userId,
            candidatePointId,
            cancellationToken);

        if (!deleted)
        {
            return NotFound(ApiResponse<bool>.Fail("Kaydedilen aday nokta bulunamadı."));
        }

        return Ok(ApiResponse<bool>.Ok(true, "Kaydedilen aday nokta kaldırıldı."));
    }

    private bool TryGetUserId(out int userId)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return int.TryParse(userIdValue, out userId);
    }
}
