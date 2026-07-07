using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Admin.Dtos;

public sealed record CreateCompanyRequest(
    [Required, MinLength(2), MaxLength(160)] string Name,
    [MaxLength(40)] string? TaxNumber,
    [EmailAddress, MaxLength(180)] string? ContactEmail);
