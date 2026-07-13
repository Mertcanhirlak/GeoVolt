namespace GeoVolt.Application.DataImports.Models;

public sealed record DatasetPromotionResult(
    bool Success,
    int DatasetImportId,
    string DatasetCode,
    int SourceFeatureCount,
    int PromotedFeatureCount,
    int RejectedFeatureCount,
    string Status,
    string Message);
