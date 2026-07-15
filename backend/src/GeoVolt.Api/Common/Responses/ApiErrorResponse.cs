namespace GeoVolt.Api.Common.Responses;

public sealed class ApiErrorResponse
{
    public bool Success { get; set; }

    public string Message { get; set; } = string.Empty;

    public string ErrorCode { get; set; } = string.Empty;

    public string TraceId { get; set; } = string.Empty;
}
