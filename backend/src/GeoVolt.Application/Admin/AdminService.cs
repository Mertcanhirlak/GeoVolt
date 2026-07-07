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

    public async Task<ApiResponse<CompanyResponse>> CreateCompanyAsync(CreateCompanyRequest request, CancellationToken cancellationToken)
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

    public async Task<ApiResponse<UserResponse>> CreateCompanyUserAsync(CreateCompanyUserRequest request, CancellationToken cancellationToken)
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

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = UserRoles.CompanyUser,
            CompanyId = company.Id,
            CreatedAtUtc = DateTime.UtcNow
        };

        var createdUser = await _adminRepository.AddUserAsync(user, cancellationToken);

        return ApiResponse<UserResponse>.Ok(ToUserResponse(createdUser), "Firma kullanıcısı oluşturuldu.");
    }

    public async Task<ApiResponse<IReadOnlyList<UserResponse>>> GetUsersAsync(CancellationToken cancellationToken)
    {
        var users = await _adminRepository.GetUsersAsync(cancellationToken);
        var response = users.Select(ToUserResponse).ToList();

        return ApiResponse<IReadOnlyList<UserResponse>>.Ok(response);
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
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
        return new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Role,
            user.CompanyId,
            user.Company?.Name);
    }
}
