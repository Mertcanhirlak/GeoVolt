using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Auth.Dtos;

public sealed record RegisterRequest(
    [Required, MinLength(2), MaxLength(120)] string FullName,
    [Required, EmailAddress, MaxLength(180)] string Email,
    [Required, MinLength(6), MaxLength(100)] string Password);
