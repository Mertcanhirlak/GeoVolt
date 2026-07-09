using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Admin.Dtos;

public sealed record AssignRolePermissionsRequest(
    [Required] IReadOnlyList<int> PermissionIds);
