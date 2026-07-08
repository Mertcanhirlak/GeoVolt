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

    public async Task<ApiResponse<UserResponse>> UpdateUserRoleAsync(
        int userId,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var role = request.Role.Trim();

        if (!UserRoles.IsValid(role))
        {
            return ApiResponse<UserResponse>.Fail("Geçersiz rol.");
        }

        var user = await _adminRepository.GetUserByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<UserResponse>.Fail("Kullanıcı bulunamadı.");
        }

        if (user.Role == UserRoles.Admin && role != UserRoles.Admin)
        {
            var adminCount = await _adminRepository.GetAdminUserCountAsync(cancellationToken);

            if (adminCount <= 1)
            {
                return ApiResponse<UserResponse>.Fail("Son admin kullanıcının rolü değiştirilemez.");
            }
        }

        if (role == UserRoles.Admin)
        {
            user.Role = UserRoles.Admin;
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
                return ApiResponse<UserResponse>.Fail("Bir firmaya en fazla 2 kullanici eklenebilir.");
            }

            user.Role = UserRoles.CompanyUser;
            user.CompanyId = company.Id;
        }

        var updatedUser = await _adminRepository.UpdateUserAsync(user, cancellationToken);

        return ApiResponse<UserResponse>.Ok(ToUserResponse(updatedUser), "Kullanıcı rolü güncellendi.");
    }

    public async Task<ApiResponse<int>> DeleteUserAsync(
        int userId,
        int currentUserId,
        CancellationToken cancellationToken)
    {
        if (userId == currentUserId)
        {
            return ApiResponse<int>.Fail("Kendi admin kullanıcınızı silemezsiniz.");
        }

        var user = await _adminRepository.GetUserByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<int>.Fail("Kullanıcı bulunamadı.");
        }

        if (user.Role == UserRoles.Admin)
        {
            var adminCount = await _adminRepository.GetAdminUserCountAsync(cancellationToken);

            if (adminCount <= 1)
            {
                return ApiResponse<int>.Fail("Son admin kullanıcı silinemez.");
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
