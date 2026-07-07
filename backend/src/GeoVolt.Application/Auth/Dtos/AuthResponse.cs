namespace GeoVolt.Application.Auth.Dtos;

public sealed record AuthResponse(
    string Token,
    DateTime ExpiresAtUtc,
    UserResponse User);
