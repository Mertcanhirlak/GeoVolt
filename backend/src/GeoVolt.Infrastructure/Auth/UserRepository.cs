using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.Auth;

public sealed class UserRepository : IUserRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public UserRepository(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken)
    {
        return _dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken);
    }

    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return _dbContext.Users
            .Include(user => user.Company)
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
                    .ThenInclude(role => role.RolePermissions)
                        .ThenInclude(rolePermission => rolePermission.Permission)
            .Include(user => user.UserPermissions)
                .ThenInclude(userPermission => userPermission.Permission)
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);
    }

    public Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return _dbContext.Users
            .AsNoTracking()
            .Include(user => user.Company)
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
                    .ThenInclude(role => role.RolePermissions)
                        .ThenInclude(rolePermission => rolePermission.Permission)
            .Include(user => user.UserPermissions)
                .ThenInclude(userPermission => userPermission.Permission)
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
    }

    public async Task UpdatePasswordAsync(
        int userId,
        string passwordHash,
        CancellationToken cancellationToken)
    {
        await _dbContext.Users
            .Where(user => user.Id == userId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.PasswordHash, passwordHash)
                .SetProperty(user => user.MustChangePassword, false)
                .SetProperty(user => user.UpdatedAtUtc, DateTime.UtcNow),
                cancellationToken);
    }
}
