using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Admin.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize(Roles = UserRoles.Admin)]
[Route("api/admin/roles")]
public sealed class AdminRolesController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminRolesController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<RoleResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RoleResponse>>>> GetRoles(CancellationToken cancellationToken)
    {
        var response = await _adminService.GetRolesAsync(cancellationToken);

        return Ok(response);
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<RoleResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<RoleResponse>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<RoleResponse>>> CreateRole(
        CreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _adminService.CreateRoleAsync(request, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpPatch("{roleId:int}")]
    [ProducesResponseType(typeof(ApiResponse<RoleResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<RoleResponse>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<RoleResponse>>> UpdateRole(
        int roleId,
        UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _adminService.UpdateRoleAsync(roleId, request, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpDelete("{roleId:int}")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<int>>> DeleteRole(
        int roleId,
        CancellationToken cancellationToken)
    {
        var response = await _adminService.DeleteRoleAsync(roleId, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpPut("{roleId:int}/permissions")]
    [ProducesResponseType(typeof(ApiResponse<RoleResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<RoleResponse>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<RoleResponse>>> AssignPermissions(
        int roleId,
        AssignRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _adminService.AssignRolePermissionsAsync(roleId, request, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }
}
