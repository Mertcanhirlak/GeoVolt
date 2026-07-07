using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Admin.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize(Roles = UserRoles.Admin)]
[Route("api/admin/companies")]
public sealed class AdminCompaniesController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminCompaniesController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpPost]
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
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CompanyResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CompanyResponse>>>> GetCompanies(
        CancellationToken cancellationToken)
    {
        var response = await _adminService.GetCompaniesAsync(cancellationToken);

        return Ok(response);
    }
}
