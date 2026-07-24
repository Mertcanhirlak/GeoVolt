namespace GeoVolt.Domain.Constants;

public static class CandidatePointSourceTypes
{
    public const string SystemAnalysis = "SYSTEM_ANALYSIS";
    public const string UserManual = "USER_MANUAL";
    public const string AdminManual = "ADMIN_MANUAL";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        SystemAnalysis,
        UserManual,
        AdminManual
    };
}
