using GeoVolt.Application.DataImports.Models;

namespace GeoVolt.Application.DataImports.Abstractions;

public interface IDataImportPromotionService
{
    Task<DatasetPromotionResult> PromoteAsync(
        int datasetImportId,
        CancellationToken cancellationToken);
}
