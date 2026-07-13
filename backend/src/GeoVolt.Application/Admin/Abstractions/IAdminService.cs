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

    Task<ApiResponse<UserResponse>> UpdateUserRoleAsync(int userId, UpdateUserRoleRequest request, CancellationToken cancellationToken);

    Task<ApiResponse<int>> DeleteUserAsync(int userId, int currentUserId, CancellationToken cancellationToken);

    Task<ApiResponse<int>> DeleteCompanyAsync(int companyId, CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<RoleResponse>>> GetRolesAsync(CancellationToken cancellationToken);

    Task<ApiResponse<RoleResponse>> CreateRoleAsync(CreateRoleRequest request, CancellationToken cancellationToken);

    Task<ApiResponse<RoleResponse>> UpdateRoleAsync(int roleId, UpdateRoleRequest request, CancellationToken cancellationToken);

    Task<ApiResponse<int>> DeleteRoleAsync(int roleId, CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<PermissionResponse>>> GetPermissionsAsync(CancellationToken cancellationToken);

    Task<ApiResponse<RoleResponse>> AssignRolePermissionsAsync(
        int roleId,
        AssignRolePermissionsRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<UserResponse>> AssignUserRolesAsync(
        int userId,
        AssignUserRolesRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<UserPermissionResponse>>> GetUserPermissionsAsync(
        int userId,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<UserPermissionResponse>>> AssignUserPermissionsAsync(
        int userId,
        AssignUserPermissionsRequest request,
        CancellationToken cancellationToken);
}
