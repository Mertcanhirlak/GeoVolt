using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Route("api/candidate-points")]
public sealed class CandidatePointsController : ControllerBase
{
    private readonly ICandidatePointService _candidatePointService;

    public CandidatePointsController(ICandidatePointService candidatePointService)
    {
        _candidatePointService = candidatePointService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CandidatePointResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CandidatePointResponse>>>> GetCandidatePoints(
        [FromQuery] CandidatePointQuery query,
        CancellationToken cancellationToken)
    {
        var response = await _candidatePointService.GetCandidatePointsAsync(query, cancellationToken);

        return Ok(response);
    }
}
