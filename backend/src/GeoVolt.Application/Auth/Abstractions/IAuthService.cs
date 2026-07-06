using GeoVolt.Application.Auth.Dtos;
using GeoVolt.Application.Common;

namespace GeoVolt.Application.Auth.Abstractions;

public interface IAuthService
{
    Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    Task<ApiResponse<UserResponse>> GetCurrentUserAsync(int userId, CancellationToken cancellationToken);
}
