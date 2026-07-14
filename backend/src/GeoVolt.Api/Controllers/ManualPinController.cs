using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Application.ManualPins.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Route("api/manual-pin")]
[Authorize]
public sealed class ManualPinController : ControllerBase
{
    private readonly IManualPinService _manualPinService;

    public ManualPinController(IManualPinService manualPinService)
    {
        _manualPinService = manualPinService;
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
}
