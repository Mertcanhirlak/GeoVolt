using System.Security.Claims;
using System.Text;
using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Application.Auth.Dtos;
using GeoVolt.Application.Auth.Options;
using GeoVolt.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace GeoVolt.Infrastructure.Auth;

public sealed class JwtTokenService : ITokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public AuthResponse CreateToken(User user)
    {
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_options.ExpirationMinutes);
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Email, user.Email),
            new("mustChangePassword", user.MustChangePassword ? "true" : "false")
        };

        foreach (var roleName in GetRoleNames(user))
        {
            claims.Add(new Claim(ClaimTypes.Role, roleName));
        }

        foreach (var permissionName in GetPermissionNames(user))
        {
            claims.Add(new Claim("permission", permissionName));
        }

        if (user.CompanyId.HasValue)
        {
            claims.Add(new Claim("companyId", user.CompanyId.Value.ToString()));
        }

        if (!string.IsNullOrWhiteSpace(user.Company?.Name))
        {
            claims.Add(new Claim("companyName", user.Company.Name));
        }

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = expiresAtUtc,
            SigningCredentials = credentials,
            Subject = new ClaimsIdentity(claims)
        };

        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        var primaryRole = GetRoleNames(user).FirstOrDefault() ?? user.Role;
        var userResponse = new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            primaryRole,
            user.CompanyId,
            user.Company?.Name,
            GetPermissionNames(user),
            user.MustChangePassword);

        return new AuthResponse(token, expiresAtUtc, userResponse);
    }

    private static IReadOnlyList<string> GetRoleNames(User user)
    {
        var roleNames = user.UserRoles
            .Select(userRole => userRole.Role?.Name)
            .Where(roleName => !string.IsNullOrWhiteSpace(roleName))
            .Select(roleName => roleName!)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (roleNames.Count == 0 && !string.IsNullOrWhiteSpace(user.Role))
        {
            roleNames.Add(user.Role);
        }

        return roleNames;
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
            .ToList();
    }
}
