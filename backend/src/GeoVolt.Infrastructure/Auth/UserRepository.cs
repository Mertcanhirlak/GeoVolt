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
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);
    }

    public Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return _dbContext.Users
            .AsNoTracking()
            .Include(user => user.Company)
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
    }
}
