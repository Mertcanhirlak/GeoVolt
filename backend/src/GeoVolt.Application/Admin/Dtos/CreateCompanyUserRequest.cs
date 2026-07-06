using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Admin.Dtos;

public sealed record CreateCompanyUserRequest(
    [Required, MinLength(2), MaxLength(120)] string FullName,
    [Required, EmailAddress, MaxLength(180)] string Email,
    [Required, MinLength(6), MaxLength(100)] string Password,
    [Required, Range(1, int.MaxValue)] int CompanyId);
