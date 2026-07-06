using GeoVolt.Application.Admin.Abstractions;
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
}
