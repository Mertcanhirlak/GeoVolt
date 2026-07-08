namespace GeoVolt.Domain.Constants;

public static class UserRoles
{
    public const string Admin = "Admin";
    public const string CompanyUser = "CompanyUser";

    public static readonly IReadOnlyList<string> All = new[]
    {
        Admin,
        CompanyUser
    };

    public static bool IsValid(string role)
    {
        return All.Contains(role);
    }
}
