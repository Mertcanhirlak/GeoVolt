using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Auth.Dtos;

public sealed record ChangePasswordRequest(
    [Required, MinLength(6), MaxLength(100)] string CurrentPassword,
    [Required, MinLength(6), MaxLength(100)] string NewPassword,
    [Required, MinLength(6), MaxLength(100)] string ConfirmNewPassword);
