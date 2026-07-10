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
            GetPermissionNames(user));
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
