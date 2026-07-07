namespace GeoVolt.Infrastructure.Options;

public sealed class DefaultAdminOptions
{
    public const string SectionName = "DefaultAdmin";

    public string FullName { get; set; } = "System Admin";

    public string Email { get; set; } = "admin@geovolt.com";

    public string Password { get; set; } = "Admin123!";
}
