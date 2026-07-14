using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Admin.Dtos;

public sealed record UpdateRoleRequest(
    [Required, MaxLength(80)] string Name,
    [MaxLength(240)] string? Description);
