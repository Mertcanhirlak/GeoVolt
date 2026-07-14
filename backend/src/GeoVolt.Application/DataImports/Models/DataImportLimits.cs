namespace GeoVolt.Application.DataImports.Models;

public static class DataImportLimits
{
    public const long MaximumGeoJsonFileSizeBytes = 64L * 1024 * 1024;
    public const long MaximumMultipartRequestSizeBytes = 65L * 1024 * 1024;
}
