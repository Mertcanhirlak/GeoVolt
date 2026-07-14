namespace GeoVolt.Application.Admin.Dtos;

public sealed record PermissionResponse(
    int Id,
    string Name,
    string Description,
    string Category);
