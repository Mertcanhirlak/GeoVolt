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
}
