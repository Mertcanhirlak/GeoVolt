namespace GeoVolt.Domain.Constants;

public static class SuitabilityMetricDefaults
{
    public const int PoiNearRadiusMeters = 300;
    public const int PoiMediumRadiusMeters = 500;
    public const int PoiFarRadiusMeters = 1000;

    public static readonly string[] MajorRoadTypes =
    [
        "Ana Arter",
        "Bulvar",
        "Cadde",
        "Devlet Yolu",
        "Otoyol",
        "Otoyol Bağlantısı"
    ];
}
