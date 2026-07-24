namespace GeoVolt.Application.Auth.Dtos;

public sealed record UserResponse(
    int Id,
    string FullName,
    string Email,
    string Role,
    int? CompanyId,
    string? CompanyName,
    IReadOnlyList<string> Permissions,
    bool MustChangePassword);
