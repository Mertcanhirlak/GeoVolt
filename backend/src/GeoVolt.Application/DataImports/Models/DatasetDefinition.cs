namespace GeoVolt.Application.DataImports.Models;

public sealed record DatasetDefinition(
    string Code,
    string FileName,
    IReadOnlySet<string> AllowedGeometryTypes,
    IReadOnlySet<string> RequiredProperties);
