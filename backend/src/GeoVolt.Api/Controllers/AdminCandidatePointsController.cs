using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.CandidatePoints.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/candidate-points")]
public sealed class AdminCandidatePointsController : ControllerBase
{
    private readonly ICandidatePointService _candidatePointService;

    public AdminCandidatePointsController(ICandidatePointService candidatePointService)
    {
        _candidatePointService = candidatePointService;
    }

    [HttpGet]
    [Authorize(Policy = PermissionNames.PointRead)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CandidatePointResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CandidatePointResponse>>>> GetAll(
        [FromQuery] CandidatePointQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await _candidatePointService.GetCandidatePointsAsync(query, cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = PermissionNames.PointCreate)]
    [ProducesResponseType(typeof(ApiResponse<CandidatePointResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<CandidatePointResponse>>> Create(
        CreateCandidatePointRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _candidatePointService.CreateAsync(request, cancellationToken);
        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = PermissionNames.PointUpdate)]
    [ProducesResponseType(typeof(ApiResponse<CandidatePointResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<CandidatePointResponse>>> Update(
        int id,
        UpdateCandidatePointRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _candidatePointService.UpdateAsync(id, request, cancellationToken);
        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = PermissionNames.PointDelete)]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<int>>> Delete(int id, CancellationToken cancellationToken)
    {
        var response = await _candidatePointService.DeleteAsync(id, cancellationToken);
        return response.Success ? Ok(response) : BadRequest(response);
    }
}
