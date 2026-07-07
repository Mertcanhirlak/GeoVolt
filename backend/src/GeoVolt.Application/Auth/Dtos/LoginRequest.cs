using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Auth.Dtos;

public sealed record LoginRequest(
    [Required, EmailAddress, MaxLength(180)] string Email,
    [Required, MinLength(6), MaxLength(100)] string Password);
