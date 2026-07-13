using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Admin.Abstractions;

public interface IAdminRepository
{
    Task<Company> AddCompanyAsync(Company company, CancellationToken cancellationToken);

    Task<IReadOnlyList<Company>> GetCompaniesAsync(CancellationToken cancellationToken);

    Task<Company?> GetCompanyByIdAsync(int companyId, CancellationToken cancellationToken);

    Task<int> GetCompanyUserCountAsync(int companyId, CancellationToken cancellationToken);

    Task<int> GetCompanyUserCountExceptAsync(int companyId, int userId, CancellationToken cancellationToken);

    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken);

    Task<User> AddUserAsync(User user, CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> GetUsersAsync(CancellationToken cancellationToken);

    Task<User?> GetUserByIdAsync(int userId, CancellationToken cancellationToken);

    Task<int> GetAdminUserCountAsync(CancellationToken cancellationToken);

    Task<User> UpdateUserAsync(User user, CancellationToken cancellationToken);

    Task<bool> DeleteUserAsync(User user, CancellationToken cancellationToken);

    Task<bool> DeleteCompanyAsync(Company company, CancellationToken cancellationToken);

    Task<IReadOnlyList<Role>> GetRolesAsync(CancellationToken cancellationToken);

    Task<Role?> GetRoleByIdAsync(int roleId, CancellationToken cancellationToken);

    Task<Role?> GetRoleByNameAsync(string roleName, CancellationToken cancellationToken);

    Task<bool> RoleNameExistsAsync(string roleName, int? exceptRoleId, CancellationToken cancellationToken);

    Task<Role> AddRoleAsync(Role role, CancellationToken cancellationToken);

    Task<Role> UpdateRoleAsync(Role role, CancellationToken cancellationToken);

    Task<bool> DeleteRoleAsync(Role role, CancellationToken cancellationToken);

    Task<IReadOnlyList<Permission>> GetPermissionsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<Permission>> GetPermissionsByIdsAsync(IReadOnlyList<int> permissionIds, CancellationToken cancellationToken);

    Task<IReadOnlyList<Role>> GetRolesByIdsAsync(IReadOnlyList<int> roleIds, CancellationToken cancellationToken);

    Task ReplaceRolePermissionsAsync(Role role, IReadOnlyList<Permission> permissions, CancellationToken cancellationToken);

    Task ReplaceUserRolesAsync(User user, IReadOnlyList<Role> roles, CancellationToken cancellationToken);

    Task ReplaceUserPermissionsAsync(User user, IReadOnlyList<Permission> permissions, CancellationToken cancellationToken);
}
