using GeoVolt.Application.Common;
using GeoVolt.Application.CostEstimations.Abstractions;
using GeoVolt.Application.CostEstimations.Dtos;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/cost-profiles")]
public sealed class AdminCostProfilesController : ControllerBase
{
    private readonly ICostProfileManagementService _service;

    public AdminCostProfilesController(
        ICostProfileManagementService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Policy = PermissionNames.CostRead)]
    [ProducesResponseType(
        typeof(ApiResponse<IReadOnlyList<CostProfileResponse>>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CostProfileResponse>>>> GetAll(
        CancellationToken cancellationToken)
    {
        var profiles = await _service.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CostProfileResponse>>.Ok(
            profiles,
            $"{profiles.Count} maliyet profili getirildi."));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = PermissionNames.CostUpdate)]
    [ProducesResponseType(
        typeof(ApiResponse<CostProfileResponse>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<CostProfileResponse>>> Update(
        int id,
        UpdateCostProfileRequest request,
        CancellationToken cancellationToken)
    {
        var profile = await _service.UpdateAsync(
            id,
            request,
            cancellationToken);

        return Ok(ApiResponse<CostProfileResponse>.Ok(
            profile,
            $"{profile.SystemType} {profile.PowerKw} kW maliyet profili güncellendi."));
    }
}
