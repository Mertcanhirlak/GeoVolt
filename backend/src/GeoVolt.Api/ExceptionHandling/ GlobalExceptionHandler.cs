using System.Diagnostics;
using GeoVolt.Api.Common.Responses;
using Microsoft.AspNetCore.Diagnostics;

namespace GeoVolt.Api.ExceptionHandling;
// GlobalExceptionHandler, uygulama genelinde yakalanmamış istisnaları ele almak için kullanılan bir sınıftır.
public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // İstek takibi için trace id alınır.
        var traceId = Activity.Current?.Id
            ?? httpContext.TraceIdentifier;

        // Gerçek hata detayı sunucu loguna yazılır.
        logger.LogError(
            exception,
            "Beklenmeyen bir hata oluştu. TraceId: {TraceId}",
            traceId);

        var response = new ApiErrorResponse
        {
            Success = false,
            Message = "Beklenmeyen bir hata oluştu.",
            ErrorCode = "INTERNAL_SERVER_ERROR",
            TraceId = traceId
        };

        httpContext.Response.StatusCode =
            StatusCodes.Status500InternalServerError;

        await httpContext.Response.WriteAsJsonAsync(
            response,
            cancellationToken);

        return true;
    }
}