using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Auth.Options;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; set; } = "GeoVolt";

    [Required]
    public string Audience { get; set; } = "GeoVolt.Frontend";

    [Required]
    [MinLength(32)]
    public string SecretKey { get; set; } = string.Empty;

    [Range(1, 1440)]
    public int ExpirationMinutes { get; set; } = 120;
}
