namespace GeoVolt.Application.DataImports.Models;

public sealed record DatasetImportSummary(
    int Id,
    string DatasetName,
    string SourceFile,
    int FeatureCount,
    int? SourceSrid,
    int TargetSrid,
    DateTime ImportedAtUtc,
    string Status,
    string? ErrorMessage);
