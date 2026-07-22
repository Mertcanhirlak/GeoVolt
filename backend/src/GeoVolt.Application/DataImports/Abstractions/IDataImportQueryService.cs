using GeoVolt.Application.DataImports.Models;

namespace GeoVolt.Application.DataImports.Abstractions;

public interface IDataImportQueryService
{
    Task<IReadOnlyList<DatasetImportSummary>> GetRecentAsync(
        int limit,
        CancellationToken cancellationToken);
}
