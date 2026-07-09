using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GeoVolt.Infrastructure.Persistence;

public sealed class DatabaseSeeder
{
    private readonly GeoVoltDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly DefaultAdminOptions _defaultAdminOptions;

    public DatabaseSeeder(
        GeoVoltDbContext dbContext,
        IPasswordHasher passwordHasher,
        IOptions<DefaultAdminOptions> defaultAdminOptions)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _defaultAdminOptions = defaultAdminOptions.Value;
    }

    public async Task SeedDefaultAdminAsync(CancellationToken cancellationToken = default)
    {
        await SeedRolesAsync(cancellationToken);
        await SeedPermissionsAsync(cancellationToken);
        await SeedAdminRolePermissionsAsync(cancellationToken);
        await SeedAdminUserAsync(cancellationToken);
        await BackfillUserRolesAsync(cancellationToken);
    }

    private async Task SeedRolesAsync(CancellationToken cancellationToken)
    {
        await EnsureRoleAsync(UserRoles.Admin, "Sistem yoneticisi", true, cancellationToken);
        await EnsureRoleAsync(UserRoles.CompanyUser, "Firma kullanicisi", true, cancellationToken);
    }

    private async Task EnsureRoleAsync(
        string name,
        string description,
        bool isSystem,
        CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles.FirstOrDefaultAsync(item => item.Name == name, cancellationToken);

        if (role is null)
        {
            await _dbContext.Roles.AddAsync(new Role
            {
                Name = name,
                Description = description,
                IsSystem = isSystem,
                CreatedAtUtc = DateTime.UtcNow
            }, cancellationToken);

            await _dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        role.Description ??= description;
        role.IsSystem = isSystem;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedPermissionsAsync(CancellationToken cancellationToken)
    {
        foreach (var seed in PermissionNames.All)
        {
            var permission = await _dbContext.Permissions
                .FirstOrDefaultAsync(item => item.Name == seed.Name, cancellationToken);

            if (permission is null)
            {
                await _dbContext.Permissions.AddAsync(new Permission
                {
                    Name = seed.Name,
                    Description = seed.Description,
                    Category = seed.Category,
                    CreatedAtUtc = DateTime.UtcNow
                }, cancellationToken);
            }
            else
            {
                permission.Description = seed.Description;
                permission.Category = seed.Category;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedAdminRolePermissionsAsync(CancellationToken cancellationToken)
    {
        var adminRole = await _dbContext.Roles
            .Include(role => role.RolePermissions)
            .FirstAsync(role => role.Name == UserRoles.Admin, cancellationToken);
        var permissions = await _dbContext.Permissions.ToListAsync(cancellationToken);
        var existingPermissionIds = adminRole.RolePermissions
            .Select(rolePermission => rolePermission.PermissionId)
            .ToHashSet();

        foreach (var permission in permissions)
        {
            if (existingPermissionIds.Contains(permission.Id))
            {
                continue;
            }

            adminRole.RolePermissions.Add(new RolePermission
            {
                RoleId = adminRole.Id,
                PermissionId = permission.Id,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedAdminUserAsync(CancellationToken cancellationToken)
    {
        var email = _defaultAdminOptions.Email.Trim().ToLowerInvariant();
        var adminExists = await _dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken);

        if (adminExists)
        {
            return;
        }

        var admin = new User
        {
            FullName = _defaultAdminOptions.FullName.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(_defaultAdminOptions.Password),
            Role = UserRoles.Admin,
            CompanyId = null,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _dbContext.Users.AddAsync(admin, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task BackfillUserRolesAsync(CancellationToken cancellationToken)
    {
        var roles = await _dbContext.Roles.ToDictionaryAsync(role => role.Name, cancellationToken);
        var users = await _dbContext.Users
            .Include(user => user.UserRoles)
            .ToListAsync(cancellationToken);

        foreach (var user in users)
        {
            if (user.UserRoles.Count > 0)
            {
                continue;
            }

            var roleName = roles.ContainsKey(user.Role) ? user.Role : UserRoles.CompanyUser;
            var role = roles[roleName];

            user.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
