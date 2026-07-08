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

        return user;
    }

    public async Task<IReadOnlyList<User>> GetUsersAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .Include(user => user.Company)
            .OrderBy(user => user.Company!.Name)
            .ThenBy(user => user.FullName)
            .ToListAsync(cancellationToken);
    }

    public Task<User?> GetUserByIdAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.Users
            .Include(user => user.Company)
            .FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
    }

    public Task<int> GetAdminUserCountAsync(CancellationToken cancellationToken)
    {
        return _dbContext.Users.CountAsync(user => user.Role == UserRoles.Admin, cancellationToken);
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
}
