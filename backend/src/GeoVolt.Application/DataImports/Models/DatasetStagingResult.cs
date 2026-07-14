namespace GeoVolt.Application.DataImports.Models;

public sealed record DatasetStagingResult(
    bool Success,
    bool IsDuplicate,
    int? DatasetImportId,
    int StagedFeatureCount,
    string Status,
    string Message,
    DatasetValidationResult Validation);
