using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.Admin;

public sealed class AdminRepository : IAdminRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public AdminRepository(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Company> AddCompanyAsync(Company company, CancellationToken cancellationToken)
    {
        await _dbContext.Companies.AddAsync(company, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return company;
    }

    public async Task<IReadOnlyList<Company>> GetCompaniesAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Companies
            .AsNoTracking()
            .Include(company => company.Users)
            .OrderBy(company => company.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Company?> GetCompanyByIdAsync(int companyId, CancellationToken cancellationToken)
    {
        return _dbContext.Companies
            .Include(company => company.Users)
            .FirstOrDefaultAsync(company => company.Id == companyId, cancellationToken);
    }

    public Task<int> GetCompanyUserCountAsync(int companyId, CancellationToken cancellationToken)
    {
        return _dbContext.Users.CountAsync(user => user.CompanyId == companyId, cancellationToken);
    }

    public Task<int> GetCompanyUserCountExceptAsync(int companyId, int userId, CancellationToken cancellationToken)
    {
        return _dbContext.Users.CountAsync(
            user => user.CompanyId == companyId && user.Id != userId,
            cancellationToken);
    }

    public Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken)
    {
        return _dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken);
    }

    public async Task<User> AddUserAsync(User user, CancellationToken cancellationToken)
    {
        await _dbContext.Users.AddAsync(user, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _dbContext.Entry(user).Reference(item => item.Company).LoadAsync(cancellationToken);
        await _dbContext.Entry(user).Collection(item => item.UserRoles).LoadAsync(cancellationToken);

        foreach (var userRole in user.UserRoles)
        {
            await _dbContext.Entry(userRole).Reference(item => item.Role).LoadAsync(cancellationToken);
        }

        return user;
    }

    public async Task<IReadOnlyList<User>> GetUsersAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .Include(user => user.Company)
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
                    .ThenInclude(role => role.RolePermissions)
                        .ThenInclude(rolePermission => rolePermission.Permission)
            .Include(user => user.UserPermissions)
                .ThenInclude(userPermission => userPermission.Permission)
            .OrderBy(user => user.Company == null ? string.Empty : user.Company.Name)
            .ThenBy(user => user.FullName)
            .ToListAsync(cancellationToken);
    }

    public Task<User?> GetUserByIdAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.Users
            .Include(user => user.Company)
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
                    .ThenInclude(role => role.RolePermissions)
                        .ThenInclude(rolePermission => rolePermission.Permission)
            .Include(user => user.UserPermissions)
                .ThenInclude(userPermission => userPermission.Permission)
            .FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
    }

    public Task<int> GetAdminUserCountAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Users.CountAsync(
            user => user.UserRoles.Any(userRole => userRole.Role.Name == UserRoles.Admin) || user.Role == UserRoles.Admin,
            cancellationToken);
    }

    public async Task<User> UpdateUserAsync(User user, CancellationToken cancellationToken)
    {
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _dbContext.Entry(user).Reference(item => item.Company).LoadAsync(cancellationToken);

        return user;
    }

    public async Task<bool> DeleteUserAsync(User user, CancellationToken cancellationToken)
    {
        _dbContext.Users.Remove(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> DeleteCompanyAsync(Company company, CancellationToken cancellationToken)
    {
        _dbContext.Companies.Remove(company);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<IReadOnlyList<Role>> GetRolesAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Roles
            .AsNoTracking()
            .Include(role => role.UserRoles)
            .Include(role => role.RolePermissions)
                .ThenInclude(rolePermission => rolePermission.Permission)
            .OrderBy(role => role.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Role?> GetRoleByIdAsync(int roleId, CancellationToken cancellationToken)
    {
        return _dbContext.Roles
            .Include(role => role.UserRoles)
            .Include(role => role.RolePermissions)
                .ThenInclude(rolePermission => rolePermission.Permission)
            .FirstOrDefaultAsync(role => role.Id == roleId, cancellationToken);
    }

    public Task<Role?> GetRoleByNameAsync(string roleName, CancellationToken cancellationToken)
    {
        return _dbContext.Roles
            .Include(role => role.RolePermissions)
            .FirstOrDefaultAsync(role => role.Name == roleName, cancellationToken);
    }

    public Task<bool> RoleNameExistsAsync(string roleName, int? exceptRoleId, CancellationToken cancellationToken)
    {
        return _dbContext.Roles.AnyAsync(
            role => role.Name == roleName && (!exceptRoleId.HasValue || role.Id != exceptRoleId.Value),
            cancellationToken);
    }

    public async Task<Role> AddRoleAsync(Role role, CancellationToken cancellationToken)
    {
        await _dbContext.Roles.AddAsync(role, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return role;
    }

    public async Task<Role> UpdateRoleAsync(Role role, CancellationToken cancellationToken)
    {
        role.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return role;
    }

    public async Task<bool> DeleteRoleAsync(Role role, CancellationToken cancellationToken)
    {
        _dbContext.Roles.Remove(role);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<IReadOnlyList<Permission>> GetPermissionsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Permissions
            .AsNoTracking()
            .OrderBy(permission => permission.Category)
            .ThenBy(permission => permission.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Permission>> GetPermissionsByIdsAsync(
        IReadOnlyList<int> permissionIds,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Permissions
            .Where(permission => permissionIds.Contains(permission.Id))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Role>> GetRolesByIdsAsync(
        IReadOnlyList<int> roleIds,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Roles
            .Where(role => roleIds.Contains(role.Id))
            .ToListAsync(cancellationToken);
    }

    public async Task ReplaceRolePermissionsAsync(
        Role role,
        IReadOnlyList<Permission> permissions,
        CancellationToken cancellationToken)
    {
        _dbContext.RolePermissions.RemoveRange(role.RolePermissions);

        role.RolePermissions = permissions
            .Select(permission => new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permission.Id,
                CreatedAtUtc = DateTime.UtcNow
            })
            .ToList();

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ReplaceUserRolesAsync(
        User user,
        IReadOnlyList<Role> roles,
        CancellationToken cancellationToken)
    {
        _dbContext.UserRoles.RemoveRange(user.UserRoles);

        user.UserRoles = roles
            .Select(role => new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                CreatedAtUtc = DateTime.UtcNow
            })
            .ToList();

        user.Role = roles.FirstOrDefault()?.Name ?? UserRoles.CompanyUser;
        user.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ReplaceUserPermissionsAsync(
        User user,
        IReadOnlyList<Permission> permissions,
        CancellationToken cancellationToken)
    {
        _dbContext.UserPermissions.RemoveRange(user.UserPermissions);

        user.UserPermissions = permissions
            .Select(permission => new UserPermission
            {
                UserId = user.Id,
                PermissionId = permission.Id,
                CreatedAtUtc = DateTime.UtcNow
            })
            .ToList();

        user.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
