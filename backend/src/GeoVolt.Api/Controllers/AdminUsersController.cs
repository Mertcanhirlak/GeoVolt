using System.Security.Claims;
using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Admin.Dtos;
using GeoVolt.Application.Auth.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize(Roles = UserRoles.Admin)]
[Route("api/admin/users")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminUsersController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> CreateCompanyUser(
        CreateCompanyUserRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _adminService.CreateCompanyUserAsync(request, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<UserResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UserResponse>>>> GetUsers(
        CancellationToken cancellationToken)
    {
        var response = await _adminService.GetUsersAsync(cancellationToken);

        return Ok(response);
    }

    [HttpPatch("{userId:int}/role")]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> UpdateUserRole(
        int userId,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _adminService.UpdateUserRoleAsync(userId, request, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpDelete("{userId:int}")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<int>>> DeleteUser(
        int userId,
        CancellationToken cancellationToken)
    {
        var currentUserIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(currentUserIdValue, out var currentUserId))
        {
            return Unauthorized(ApiResponse<int>.Fail("Geçersiz token."));
        }

        var response = await _adminService.DeleteUserAsync(userId, currentUserId, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }
}
