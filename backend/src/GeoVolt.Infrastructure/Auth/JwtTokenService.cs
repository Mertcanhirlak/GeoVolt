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

        var claims = new Dictionary<string, object>
        {
            [JwtRegisteredClaimNames.Sub] = user.Id.ToString(),
            [JwtRegisteredClaimNames.Email] = user.Email,
            [ClaimTypes.NameIdentifier] = user.Id.ToString(),
            [ClaimTypes.Name] = user.FullName,
            [ClaimTypes.Email] = user.Email,
            [ClaimTypes.Role] = user.Role
        };

        if (user.CompanyId.HasValue)
        {
            claims["companyId"] = user.CompanyId.Value.ToString();
        }

        if (!string.IsNullOrWhiteSpace(user.Company?.Name))
        {
            claims["companyName"] = user.Company.Name;
        }

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = expiresAtUtc,
            SigningCredentials = credentials,
            Claims = claims
        };

        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        var userResponse = new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Role,
            user.CompanyId,
            user.Company?.Name);

        return new AuthResponse(token, expiresAtUtc, userResponse);
    }
}
