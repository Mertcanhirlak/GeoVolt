namespace GeoVolt.Application.Admin.Dtos;

public sealed record RoleResponse(
    int Id,
    string Name,
    string? Description,
    bool IsSystem,
    int UserCount,
    IReadOnlyList<PermissionResponse> Permissions);
