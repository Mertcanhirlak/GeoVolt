using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Application.Auth.Dtos;
using GeoVolt.Application.Common;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Auth;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public AuthService(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        ITokenService tokenService)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var user = await _users.GetByEmailAsync(email, cancellationToken);

        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return ApiResponse<AuthResponse>.Fail("E-posta veya parola hatalı.");
        }

        return ApiResponse<AuthResponse>.Ok(_tokenService.CreateToken(user), "Giriş başarılı.");
    }

    public async Task<ApiResponse<UserResponse>> GetCurrentUserAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<UserResponse>.Fail("Kullanıcı bulunamadı.");
        }

        return ApiResponse<UserResponse>.Ok(ToUserResponse(user));
    }

    public async Task<ApiResponse<AuthResponse>> ChangePasswordAsync(
        int userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (request.NewPassword != request.ConfirmNewPassword)
        {
            return ApiResponse<AuthResponse>.Fail("Yeni şifre ve şifre tekrarı eşleşmiyor.");
        }

        var user = await _users.GetByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return ApiResponse<AuthResponse>.Fail("Kullanıcı bulunamadı.");
        }

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return ApiResponse<AuthResponse>.Fail("Mevcut şifre hatalı.");
        }

        if (_passwordHasher.Verify(request.NewPassword, user.PasswordHash))
        {
            return ApiResponse<AuthResponse>.Fail("Yeni şifre mevcut şifreden farklı olmalıdır.");
        }

        var newPasswordHash = _passwordHasher.Hash(request.NewPassword);
        await _users.UpdatePasswordAsync(user.Id, newPasswordHash, cancellationToken);

        user.PasswordHash = newPasswordHash;
        user.MustChangePassword = false;
        user.UpdatedAtUtc = DateTime.UtcNow;

        return ApiResponse<AuthResponse>.Ok(
            _tokenService.CreateToken(user),
            "Şifreniz başarıyla değiştirildi.");
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    private static UserResponse ToUserResponse(User user)
    {
        var role = user.UserRoles
            .Select(userRole => userRole.Role?.Name)
            .FirstOrDefault(roleName => !string.IsNullOrWhiteSpace(roleName)) ?? user.Role;

        return new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            role,
            user.CompanyId,
            user.Company?.Name,
            GetPermissionNames(user),
            user.MustChangePassword);
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
}
