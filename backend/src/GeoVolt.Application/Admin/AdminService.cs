using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Admin.Dtos;
using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Application.Auth.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Admin;

public sealed class AdminService : IAdminService
{
    private const int MaxUsersPerCompany = 2;

    private readonly IAdminRepository _adminRepository;
    private readonly IPasswordHasher _passwordHasher;

    public AdminService(IAdminRepository adminRepository, IPasswordHasher passwordHasher)
    {
        _adminRepository = adminRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<ApiResponse<CompanyResponse>> CreateCompanyAsync(
        CreateCompanyRequest request,
        CancellationToken cancellationToken)
    {
        var company = new Company
        {
            Name = request.Name.Trim(),
            TaxNumber = NormalizeOptional(request.TaxNumber),
            ContactEmail = NormalizeOptional(request.ContactEmail)?.ToLowerInvariant(),
            CreatedAtUtc = DateTime.UtcNow
        };

        var createdCompany = await _adminRepository.AddCompanyAsync(company, cancellationToken);

        return ApiResponse<CompanyResponse>.Ok(ToCompanyResponse(createdCompany), "Firma oluşturuldu.");
    }

    public async Task<ApiResponse<IReadOnlyList<CompanyResponse>>> GetCompaniesAsync(CancellationToken cancellationToken)
    {
        var companies = await _adminRepository.GetCompaniesAsync(cancellationToken);
        var response = companies.Select(ToCompanyResponse).ToList();

        return ApiResponse<IReadOnlyList<CompanyResponse>>.Ok(response);
    }

    public async Task<ApiResponse<UserResponse>> CreateCompanyUserAsync(
        CreateCompanyUserRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await _adminRepository.EmailExistsAsync(email, cancellationToken))
        {
            return ApiResponse<UserResponse>.Fail("Bu e-posta adresi zaten kayıtlı.");
        }

        var company = await _adminRepository.GetCompanyByIdAsync(request.CompanyId, cancellationToken);

        if (company is null)
        {
            return ApiResponse<UserResponse>.Fail("Firma bulunamadı.");
        }

        var userCount = await _adminRepository.GetCompanyUserCountAsync(company.Id, cancellationToken);

        if (userCount >= MaxUsersPerCompany)
        {
            return ApiResponse<UserResponse>.Fail("Bir firmaya en fazla 2 kullanıcı eklenebilir.");
        }

        var companyUserRole = await _adminRepository.GetRoleByNameAsync(UserRoles.CompanyUser, cancellationToken);

        if (companyUserRole is null)
        {
            return ApiResponse<UserResponse>.Fail("Firma Kullanıcısı rolü bulunamadı. Başlangıç verilerini kontrol edin.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = UserRoles.CompanyUser,
            CompanyId = company.Id,
            CreatedAtUtc = DateTime.UtcNow
        };

        user.UserRoles.Add(new UserRole
        {
            RoleId = companyUserRole.Id,
            CreatedAtUtc = DateTime.UtcNow
        });

        var createdUser = await _adminRepository.AddUserAsync(user, cancellationToken);

        return ApiResponse<UserResponse>.Ok(ToUserResponse(createdUser), "Firma kullanıcısı oluşturuldu.");
    }

    public async Task<ApiResponse<IReadOnlyList<UserResponse>>> GetUsersAsync(CancellationToken cancellationToken)
    {
        var users = await _adminRepository.GetUsersAsync(cancellationToken);
        var response = users.Select(ToUserResponse).ToList();

        return ApiResponse<IReadOnlyList<UserResponse>>.Ok(response);
    }

    public async Task<ApiResponse<UserResponse>> UpdateUserRoleAsync(
        int userId,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var nextRole = await _adminRepository.GetRoleByNameAsync(request.Role.Trim(), cancellationToken);

        if (nextRole is null)
        {
            return ApiResponse<UserResponse>.Fail("Geçersiz rol.");
        }

        var user = await _adminRepository.GetUserByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<UserResponse>.Fail("Kullanıcı bulunamadı.");
        }

        var currentRoleNames = GetRoleNames(user);

        if (currentRoleNames.Contains(UserRoles.Admin) && nextRole.Name != UserRoles.Admin)
        {
            var adminCount = await _adminRepository.GetAdminUserCountAsync(cancellationToken);

            if (adminCount <= 1)
            {
                return ApiResponse<UserResponse>.Fail("Son yönetici kullanıcının rolü değiştirilemez.");
            }
        }

        if (nextRole.Name == UserRoles.Admin)
        {
            user.CompanyId = null;
        }
        else
        {
            if (!request.CompanyId.HasValue)
            {
                return ApiResponse<UserResponse>.Fail("Firma kullanıcısı için firma seçilmelidir.");
            }

            var company = await _adminRepository.GetCompanyByIdAsync(request.CompanyId.Value, cancellationToken);

            if (company is null)
            {
                return ApiResponse<UserResponse>.Fail("Firma bulunamadı.");
            }

            var companyUserCount = await _adminRepository.GetCompanyUserCountExceptAsync(
                company.Id,
                user.Id,
                cancellationToken);

            if (companyUserCount >= MaxUsersPerCompany)
            {
                return ApiResponse<UserResponse>.Fail("Bir firmaya en fazla 2 kullanıcı eklenebilir.");
            }

            user.CompanyId = company.Id;
        }

        if (nextRole.Name == UserRoles.CompanyUser)
        {
            await _adminRepository.ReplaceUserPermissionsAsync(user, Array.Empty<Permission>(), cancellationToken);
        }

        await _adminRepository.ReplaceUserRolesAsync(user, new[] { nextRole }, cancellationToken);

        var updatedUser = await _adminRepository.GetUserByIdAsync(user.Id, cancellationToken) ?? user;

        return ApiResponse<UserResponse>.Ok(ToUserResponse(updatedUser), "Kullanıcı rolü güncellendi.");
    }

    public async Task<ApiResponse<int>> DeleteUserAsync(
        int userId,
        int currentUserId,
        CancellationToken cancellationToken)
    {
        if (userId == currentUserId)
        {
            return ApiResponse<int>.Fail("Kendi yönetici hesabınızı silemezsiniz.");
        }

        var user = await _adminRepository.GetUserByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<int>.Fail("Kullanıcı bulunamadı.");
        }

        if (GetRoleNames(user).Contains(UserRoles.Admin))
        {
            var adminCount = await _adminRepository.GetAdminUserCountAsync(cancellationToken);

            if (adminCount <= 1)
            {
                return ApiResponse<int>.Fail("Son yönetici kullanıcı silinemez.");
            }
        }

        await _adminRepository.DeleteUserAsync(user, cancellationToken);

        return ApiResponse<int>.Ok(userId, "Kullanıcı silindi.");
    }

    public async Task<ApiResponse<int>> DeleteCompanyAsync(int companyId, CancellationToken cancellationToken)
    {
        var company = await _adminRepository.GetCompanyByIdAsync(companyId, cancellationToken);

        if (company is null)
        {
            return ApiResponse<int>.Fail("Firma bulunamadı.");
        }

        if (company.Users.Count > 0)
        {
            return ApiResponse<int>.Fail("Firmayı silmeden önce firmaya bağlı kullanıcıları silin.");
        }

        await _adminRepository.DeleteCompanyAsync(company, cancellationToken);

        return ApiResponse<int>.Ok(companyId, "Firma silindi.");
    }

    public async Task<ApiResponse<IReadOnlyList<RoleResponse>>> GetRolesAsync(CancellationToken cancellationToken)
    {
        var roles = await _adminRepository.GetRolesAsync(cancellationToken);

        return ApiResponse<IReadOnlyList<RoleResponse>>.Ok(roles.Select(ToRoleResponse).ToList());
    }

    public async Task<ApiResponse<RoleResponse>> CreateRoleAsync(
        CreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var name = NormalizeRequired(request.Name);

        if (await _adminRepository.RoleNameExistsAsync(name, null, cancellationToken))
        {
            return ApiResponse<RoleResponse>.Fail("Bu rol adı zaten kullanılıyor.");
        }

        var role = new Role
        {
            Name = name,
            Description = NormalizeOptional(request.Description),
            IsSystem = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        var createdRole = await _adminRepository.AddRoleAsync(role, cancellationToken);

        return ApiResponse<RoleResponse>.Ok(ToRoleResponse(createdRole), "Rol oluşturuldu.");
    }

    public async Task<ApiResponse<RoleResponse>> UpdateRoleAsync(
        int roleId,
        UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var role = await _adminRepository.GetRoleByIdAsync(roleId, cancellationToken);

        if (role is null)
        {
            return ApiResponse<RoleResponse>.Fail("Rol bulunamadı.");
        }

        var name = NormalizeRequired(request.Name);

        if (role.IsSystem && role.Name != name)
        {
            return ApiResponse<RoleResponse>.Fail("Sistem rolünün adı değiştirilemez.");
        }

        if (await _adminRepository.RoleNameExistsAsync(name, role.Id, cancellationToken))
        {
            return ApiResponse<RoleResponse>.Fail("Bu rol adı zaten kullanılıyor.");
        }

        role.Name = name;
        role.Description = NormalizeOptional(request.Description);

        var updatedRole = await _adminRepository.UpdateRoleAsync(role, cancellationToken);

        return ApiResponse<RoleResponse>.Ok(ToRoleResponse(updatedRole), "Rol güncellendi.");
    }

    public async Task<ApiResponse<int>> DeleteRoleAsync(int roleId, CancellationToken cancellationToken)
    {
        var role = await _adminRepository.GetRoleByIdAsync(roleId, cancellationToken);

        if (role is null)
        {
            return ApiResponse<int>.Fail("Rol bulunamadı.");
        }

        if (role.IsSystem)
        {
            return ApiResponse<int>.Fail("Sistem rolleri silinemez.");
        }

        if (role.UserRoles.Count > 0)
        {
            return ApiResponse<int>.Fail("Bu rol kullanıcılara atanmış. Önce rol atamalarını kaldırın.");
        }

        await _adminRepository.DeleteRoleAsync(role, cancellationToken);

        return ApiResponse<int>.Ok(roleId, "Rol silindi.");
    }

    public async Task<ApiResponse<IReadOnlyList<PermissionResponse>>> GetPermissionsAsync(CancellationToken cancellationToken)
    {
        var permissions = await _adminRepository.GetPermissionsAsync(cancellationToken);

        return ApiResponse<IReadOnlyList<PermissionResponse>>.Ok(permissions.Select(ToPermissionResponse).ToList());
    }

    public async Task<ApiResponse<RoleResponse>> AssignRolePermissionsAsync(
        int roleId,
        AssignRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var role = await _adminRepository.GetRoleByIdAsync(roleId, cancellationToken);

        if (role is null)
        {
            return ApiResponse<RoleResponse>.Fail("Rol bulunamadı.");
        }

        var permissionIds = request.PermissionIds.Distinct().ToList();

        if (role.Name == UserRoles.CompanyUser && permissionIds.Count > 0)
        {
            return ApiResponse<RoleResponse>.Fail("Firma Kullanıcısı sistem rolüne yönetim yetkisi atanamaz.");
        }

        var permissions = await _adminRepository.GetPermissionsByIdsAsync(permissionIds, cancellationToken);

        if (permissions.Count != permissionIds.Count)
        {
            return ApiResponse<RoleResponse>.Fail("Geçersiz yetki seçimi var.");
        }

        await _adminRepository.ReplaceRolePermissionsAsync(role, permissions, cancellationToken);

        var updatedRole = await _adminRepository.GetRoleByIdAsync(role.Id, cancellationToken) ?? role;

        return ApiResponse<RoleResponse>.Ok(ToRoleResponse(updatedRole), "Rol yetkileri güncellendi.");
    }

    public async Task<ApiResponse<UserResponse>> AssignUserRolesAsync(
        int userId,
        AssignUserRolesRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _adminRepository.GetUserByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<UserResponse>.Fail("Kullanıcı bulunamadı.");
        }

        var roleIds = request.RoleIds.Distinct().ToList();

        if (roleIds.Count == 0)
        {
            return ApiResponse<UserResponse>.Fail("Kullanıcıya en az bir rol atanmalıdır.");
        }

        var roles = await _adminRepository.GetRolesByIdsAsync(roleIds, cancellationToken);

        if (roles.Count != roleIds.Count)
        {
            return ApiResponse<UserResponse>.Fail("Geçersiz rol seçimi var.");
        }

        var currentRoleNames = GetRoleNames(user);
        var nextRoleNames = roles.Select(role => role.Name).ToHashSet(StringComparer.Ordinal);

        if (nextRoleNames.Contains(UserRoles.CompanyUser) && nextRoleNames.Count > 1)
        {
            return ApiResponse<UserResponse>.Fail("Firma Kullanıcısı rolü başka rollerle birlikte atanamaz.");
        }

        if (currentRoleNames.Contains(UserRoles.Admin) && !nextRoleNames.Contains(UserRoles.Admin))
        {
            var adminCount = await _adminRepository.GetAdminUserCountAsync(cancellationToken);

            if (adminCount <= 1)
            {
                return ApiResponse<UserResponse>.Fail("Son yönetici kullanıcının rolü değiştirilemez.");
            }
        }

        if (nextRoleNames.Contains(UserRoles.Admin))
        {
            user.CompanyId = null;
        }

        if (nextRoleNames.Contains(UserRoles.CompanyUser))
        {
            await _adminRepository.ReplaceUserPermissionsAsync(user, Array.Empty<Permission>(), cancellationToken);
        }

        await _adminRepository.ReplaceUserRolesAsync(user, roles, cancellationToken);

        var updatedUser = await _adminRepository.GetUserByIdAsync(user.Id, cancellationToken) ?? user;

        return ApiResponse<UserResponse>.Ok(ToUserResponse(updatedUser), "Kullanıcı rolleri güncellendi.");
    }

    public async Task<ApiResponse<IReadOnlyList<UserPermissionResponse>>> GetUserPermissionsAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        var user = await _adminRepository.GetUserByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<IReadOnlyList<UserPermissionResponse>>.Fail("Kullanıcı bulunamadı.");
        }

        return ApiResponse<IReadOnlyList<UserPermissionResponse>>.Ok(ToUserPermissionResponses(user));
    }

    public async Task<ApiResponse<IReadOnlyList<UserPermissionResponse>>> AssignUserPermissionsAsync(
        int userId,
        AssignUserPermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _adminRepository.GetUserByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<IReadOnlyList<UserPermissionResponse>>.Fail("Kullanıcı bulunamadı.");
        }

        var permissionIds = request.PermissionIds.Distinct().ToList();

        if (GetRoleNames(user).Contains(UserRoles.CompanyUser) && permissionIds.Count > 0)
        {
            return ApiResponse<IReadOnlyList<UserPermissionResponse>>.Fail(
                "Firma Kullanıcısı rolündeki kullanıcıya doğrudan yönetim yetkisi atanamaz.");
        }

        var rolePermissionIds = user.UserRoles
            .SelectMany(userRole => userRole.Role.RolePermissions)
            .Select(rolePermission => rolePermission.PermissionId)
            .ToHashSet();

        if (permissionIds.Any(rolePermissionIds.Contains))
        {
            return ApiResponse<IReadOnlyList<UserPermissionResponse>>.Fail(
                "Rolden gelen yetkiler kullanıcıya yeniden doğrudan atanamaz.");
        }

        var permissions = await _adminRepository.GetPermissionsByIdsAsync(permissionIds, cancellationToken);

        if (permissions.Count != permissionIds.Count)
        {
            return ApiResponse<IReadOnlyList<UserPermissionResponse>>.Fail("Geçersiz yetki seçimi var.");
        }

        await _adminRepository.ReplaceUserPermissionsAsync(user, permissions, cancellationToken);

        var updatedUser = await _adminRepository.GetUserByIdAsync(user.Id, cancellationToken) ?? user;

        return ApiResponse<IReadOnlyList<UserPermissionResponse>>.Ok(
            ToUserPermissionResponses(updatedUser),
            "Kullanıcı yetkileri güncellendi.");
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string NormalizeRequired(string value)
    {
        return value.Trim();
    }

    private static CompanyResponse ToCompanyResponse(Company company)
    {
        return new CompanyResponse(
            company.Id,
            company.Name,
            company.TaxNumber,
            company.ContactEmail,
            company.Users.Count,
            company.CreatedAtUtc);
    }

    private static UserResponse ToUserResponse(User user)
    {
        var role = GetRoleNames(user).FirstOrDefault() ?? user.Role;

        return new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            role,
            user.CompanyId,
            user.Company?.Name,
            GetPermissionNames(user));
    }

    private static RoleResponse ToRoleResponse(Role role)
    {
        return new RoleResponse(
            role.Id,
            role.Name,
            role.Description,
            role.IsSystem,
            role.UserRoles.Count,
            role.RolePermissions
                .Select(rolePermission => ToPermissionResponse(rolePermission.Permission))
                .OrderBy(permission => permission.Category)
                .ThenBy(permission => permission.Name)
                .ToList());
    }

    private static PermissionResponse ToPermissionResponse(Permission permission)
    {
        return new PermissionResponse(
            permission.Id,
            permission.Name,
            permission.Description,
            permission.Category);
    }

    private static IReadOnlyList<UserPermissionResponse> ToUserPermissionResponses(User user)
    {
        var roleSourcesByPermissionId = user.UserRoles
            .Where(userRole => userRole.Role is not null)
            .SelectMany(userRole => userRole.Role!.RolePermissions.Select(rolePermission => new UserPermissionSource(
                rolePermission.Permission,
                userRole.Role!.Name)))
            .GroupBy(item => item.Permission.Id)
            .ToDictionary(group => group.Key, group => group.ToList());

        var directPermissionsById = user.UserPermissions
            .ToDictionary(userPermission => userPermission.PermissionId, userPermission => userPermission.Permission);

        var permissionIds = roleSourcesByPermissionId.Keys
            .Concat(directPermissionsById.Keys)
            .Distinct()
            .OrderBy(permissionId => permissionId)
            .ToList();

        return permissionIds.Select(permissionId =>
        {
            var roleSources = roleSourcesByPermissionId.GetValueOrDefault(permissionId) ?? new List<UserPermissionSource>();
            var permission = roleSources.Count > 0
                ? roleSources[0].Permission
                : directPermissionsById[permissionId];
            var sourceRoleNames = roleSources
                .Select(item => item.RoleName)
                .Distinct()
                .OrderBy(name => name)
                .ToList();
            var hasDirectPermission = directPermissionsById.ContainsKey(permissionId);
            var hasRolePermission = sourceRoleNames.Count > 0;

            return new UserPermissionResponse(
                permission.Id,
                permission.Name,
                permission.Description,
                permission.Category,
                hasRolePermission && hasDirectPermission ? "RoleAndUser" : hasRolePermission ? "Role" : "User",
                sourceRoleNames,
                !hasRolePermission);
        }).ToList();
    }

    private static HashSet<string> GetRoleNames(User user)
    {
        var roleNames = user.UserRoles
            .Select(userRole => userRole.Role?.Name)
            .Where(roleName => !string.IsNullOrWhiteSpace(roleName))
            .Select(roleName => roleName!)
            .ToHashSet(StringComparer.Ordinal);

        if (roleNames.Count == 0 && !string.IsNullOrWhiteSpace(user.Role))
        {
            roleNames.Add(user.Role);
        }

        return roleNames;
    }

    private static IReadOnlyList<string> GetPermissionNames(User user)
    {
        return user.UserRoles
            .Where(userRole => userRole.Role is not null)
            .SelectMany(userRole => userRole.Role!.RolePermissions)
            .Select(rolePermission => rolePermission.Permission.Name)
            .Concat(user.UserPermissions.Select(userPermission => userPermission.Permission.Name))
            .Where(permissionName => !string.IsNullOrWhiteSpace(permissionName))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(permissionName => permissionName)
            .ToList();
    }

    private sealed record UserPermissionSource(Permission Permission, string RoleName);
}
