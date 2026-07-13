using GeoVolt.Application.DataImports.Models;

namespace GeoVolt.Application.DataImports.Abstractions;

public interface IDataImportStagingService
{
    Task<DatasetStagingResult> StageGeoJsonAsync(
        Stream stream,
        string fileName,
        CancellationToken cancellationToken);
}
