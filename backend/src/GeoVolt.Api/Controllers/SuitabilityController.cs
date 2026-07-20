using GeoVolt.Application.Common;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/suitability")]
public sealed class SuitabilityController : ControllerBase
{
    private readonly ISuitabilityAnalysisService _service;

    public SuitabilityController(ISuitabilityAnalysisService service)
    {
        _service = service;
    }

    [HttpGet("evaluate")]
    [ProducesResponseType(typeof(ApiResponse<SuitabilityLocationEvaluationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<SuitabilityLocationEvaluationResponse>>> EvaluateLocation(
        [FromQuery] EvaluateSuitabilityLocationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.EvaluateLocationAsync(request, cancellationToken);

        return Ok(ApiResponse<SuitabilityLocationEvaluationResponse>.Ok(
            result,
            "Konum uygunluk değerlendirmesi tamamlandı."));
    }
}
