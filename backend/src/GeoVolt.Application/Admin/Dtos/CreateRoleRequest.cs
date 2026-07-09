using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Admin.Dtos;

public sealed record CreateRoleRequest(
    [Required, MaxLength(80)] string Name,
    [MaxLength(240)] string? Description);
