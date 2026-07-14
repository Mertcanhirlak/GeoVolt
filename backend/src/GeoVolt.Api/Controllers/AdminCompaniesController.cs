using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Admin.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/companies")]
public sealed class AdminCompaniesController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminCompaniesController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpPost]
    [Authorize(Policy = PermissionNames.UserCreate)]
    [ProducesResponseType(typeof(ApiResponse<CompanyResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CompanyResponse>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<CompanyResponse>>> CreateCompany(
        CreateCompanyRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _adminService.CreateCompanyAsync(request, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpGet]
    [Authorize(Policy = PermissionNames.UserRead)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CompanyResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CompanyResponse>>>> GetCompanies(
        CancellationToken cancellationToken)
    {
        var response = await _adminService.GetCompaniesAsync(cancellationToken);

        return Ok(response);
    }

    [HttpDelete("{companyId:int}")]
    [Authorize(Policy = PermissionNames.UserDelete)]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<int>>> DeleteCompany(
        int companyId,
        CancellationToken cancellationToken)
    {
        var response = await _adminService.DeleteCompanyAsync(companyId, cancellationToken);

        return response.Success ? Ok(response) : BadRequest(response);
    }
}
