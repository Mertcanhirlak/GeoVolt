using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Admin.Dtos;

public sealed record UpdateUserRoleRequest(
    [Required, MaxLength(40)] string Role,
    int? CompanyId);
