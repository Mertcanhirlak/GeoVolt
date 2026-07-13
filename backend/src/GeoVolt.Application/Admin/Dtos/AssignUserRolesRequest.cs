using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Admin.Dtos;

public sealed record AssignUserRolesRequest(
    [Required] IReadOnlyList<int> RoleIds);
