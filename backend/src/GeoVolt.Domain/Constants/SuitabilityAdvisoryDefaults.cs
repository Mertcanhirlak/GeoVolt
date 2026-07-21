namespace GeoVolt.Domain.Constants;

public static class SuitabilityAdvisoryDefaults
{
    // These are advisory thresholds, not engineering hard-exclusion limits.
    public const double MajorRoadWarningDistanceMeters = 1000d;
    public const decimal SteepSlopeWarningPercent = 15m;
}
