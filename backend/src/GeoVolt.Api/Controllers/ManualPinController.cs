using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Application.ManualPins.Dtos;
using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Route("api/manual-pin")]
[Authorize]
public sealed class ManualPinController : ControllerBase
{
    private readonly IManualPinService _manualPinService;
    private readonly ICandidatePointService _candidatePointService;

    public ManualPinController(
        IManualPinService manualPinService,
        ICandidatePointService candidatePointService)
    {
        _manualPinService = manualPinService;
        _candidatePointService = candidatePointService;
    }

    [HttpPost("evaluate")]
    public async Task<IActionResult> EvaluateAsync(
        [FromBody] ManualPinEvaluateRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _manualPinService.EvaluateAsync(
            request,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("candidate")]
    [ProducesResponseType(typeof(ApiResponse<CandidatePointResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<CandidatePointResponse>>> CreateCandidateAsync(
        [FromBody] CreateUserManualCandidateRequest request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var response = await _candidatePointService.CreateUserManualAsync(
            request,
            userId,
            cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }
}
