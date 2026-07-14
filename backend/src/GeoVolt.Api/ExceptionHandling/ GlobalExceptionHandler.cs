using System.Diagnostics;
using GeoVolt.Api.Common.Responses;
using GeoVolt.Application.Common.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace GeoVolt.Api.ExceptionHandling;

// Uygulama genelindeki yakalanmamış hataları yönetir.
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

        var statusCode = exception switch
        {
            NotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status500InternalServerError
        };

        var errorCode = exception switch
        {
            NotFoundException => "NOT_FOUND",
            _ => "INTERNAL_SERVER_ERROR"
        };

        var message = exception switch
        {
            NotFoundException => exception.Message,
            _ => "Beklenmeyen bir hata oluştu."
        };

        if (exception is NotFoundException)
        {
            logger.LogWarning(
                exception,
                "Kaynak bulunamadı. TraceId: {TraceId}",
                traceId);
        }
        else
        {
            logger.LogError(
                exception,
                "Beklenmeyen bir hata oluştu. TraceId: {TraceId}",
                traceId);
        }

        var response = new ApiErrorResponse
        {
            Success = false,
            Message = message,
            ErrorCode = errorCode,
            TraceId = traceId
        };

        httpContext.Response.StatusCode = statusCode;

        await httpContext.Response.WriteAsJsonAsync(
            response,
            cancellationToken);

        return true;
    }
}