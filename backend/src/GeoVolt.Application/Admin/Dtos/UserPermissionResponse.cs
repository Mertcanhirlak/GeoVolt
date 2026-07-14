namespace GeoVolt.Application.Admin.Dtos;

public sealed record UserPermissionResponse(
    int Id,
    string Name,
    string Description,
    string Category,
    string Source,
    IReadOnlyList<string> SourceRoleNames,
    bool CanAssignDirectly);
