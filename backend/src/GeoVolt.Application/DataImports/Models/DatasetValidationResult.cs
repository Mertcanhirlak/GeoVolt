namespace GeoVolt.Application.DataImports.Models;

public sealed record DatasetValidationResult(
    bool IsValid,
    string FileName,
    string? DatasetCode,
    long FileSizeBytes,
    string Sha256,
    int FeatureCount,
    IReadOnlyList<string> GeometryTypes,
    IReadOnlyList<string> DetectedProperties,
    IReadOnlyList<string> Errors,
    IReadOnlyList<string> Warnings);
