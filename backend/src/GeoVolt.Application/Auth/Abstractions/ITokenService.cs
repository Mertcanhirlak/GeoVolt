using GeoVolt.Application.Auth.Dtos;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Auth.Abstractions;

public interface ITokenService
{
    AuthResponse CreateToken(User user);
}
