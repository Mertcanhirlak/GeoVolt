using GeoVolt.Application.Common;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/suitability-analysis")]
public sealed class AdminSuitabilityAnalysisController : ControllerBase
{
    private readonly ISuitabilityAnalysisService _service;

    public AdminSuitabilityAnalysisController(ISuitabilityAnalysisService service)
    {
        _service = service;
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
}
