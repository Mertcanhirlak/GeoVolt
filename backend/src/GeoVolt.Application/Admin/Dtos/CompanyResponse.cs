namespace GeoVolt.Application.Admin.Dtos;

public sealed record CompanyResponse(
    int Id,
    string Name,
    string? TaxNumber,
    string? ContactEmail,
    int UserCount,
    DateTime CreatedAtUtc);
