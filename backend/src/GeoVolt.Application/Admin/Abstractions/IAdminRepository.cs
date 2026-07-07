using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Admin.Abstractions;

public interface IAdminRepository
{
    Task<Company> AddCompanyAsync(Company company, CancellationToken cancellationToken);

    Task<IReadOnlyList<Company>> GetCompaniesAsync(CancellationToken cancellationToken);

    Task<Company?> GetCompanyByIdAsync(int companyId, CancellationToken cancellationToken);

    Task<int> GetCompanyUserCountAsync(int companyId, CancellationToken cancellationToken);

    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken);

    Task<User> AddUserAsync(User user, CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> GetUsersAsync(CancellationToken cancellationToken);
}
