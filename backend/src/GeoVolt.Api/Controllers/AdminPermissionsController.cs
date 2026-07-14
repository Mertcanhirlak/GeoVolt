using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Admin.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/permissions")]
public sealed class AdminPermissionsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminPermissionsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    [Authorize(Policy = PermissionNames.PermissionAssign)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<PermissionResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PermissionResponse>>>> GetPermissions(
        CancellationToken cancellationToken)
    {
        var response = await _adminService.GetPermissionsAsync(cancellationToken);

        return Ok(response);
    }
}
