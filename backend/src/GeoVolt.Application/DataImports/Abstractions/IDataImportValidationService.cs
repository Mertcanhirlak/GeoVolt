using GeoVolt.Application.DataImports.Models;

namespace GeoVolt.Application.DataImports.Abstractions;

public interface IDataImportValidationService
{
    Task<DatasetValidationResult> ValidateGeoJsonAsync(
        Stream stream,
        string fileName,
        CancellationToken cancellationToken);
}
