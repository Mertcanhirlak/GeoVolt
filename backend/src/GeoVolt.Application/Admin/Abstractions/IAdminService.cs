using GeoVolt.Application.Admin.Dtos;
using GeoVolt.Application.Auth.Dtos;
using GeoVolt.Application.Common;

namespace GeoVolt.Application.Admin.Abstractions;

public interface IAdminService
{
    Task<ApiResponse<CompanyResponse>> CreateCompanyAsync(CreateCompanyRequest request, CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<CompanyResponse>>> GetCompaniesAsync(CancellationToken cancellationToken);

    Task<ApiResponse<UserResponse>> CreateCompanyUserAsync(CreateCompanyUserRequest request, CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<UserResponse>>> GetUsersAsync(CancellationToken cancellationToken);
}
