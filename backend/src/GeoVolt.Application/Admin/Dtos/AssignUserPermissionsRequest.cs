using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Admin.Dtos;

public sealed record AssignUserPermissionsRequest(
    [Required] IReadOnlyList<int> PermissionIds);
