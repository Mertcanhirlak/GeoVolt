using System.Diagnostics;
using GeoVolt.Api.Common.Responses;
using GeoVolt.Application.Common.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace GeoVolt.Api.ExceptionHandling;

public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var traceId = Activity.Current?.Id
            ?? httpContext.TraceIdentifier;
        var isNotFound = exception is NotFoundException;
        var isConflict = exception is ConflictException;

        if (isNotFound || isConflict)
        {
            logger.LogWarning(
                "İstek tamamlanamadı. TraceId: {TraceId}. Mesaj: {Message}",
                traceId,
                exception.Message);
        }
        else
        {
            logger.LogError(
                exception,
                "Beklenmeyen bir hata oluştu. TraceId: {TraceId}",
                traceId);
        }

        httpContext.Response.StatusCode = isNotFound
            ? StatusCodes.Status404NotFound
            : isConflict
                ? StatusCodes.Status409Conflict
                : StatusCodes.Status500InternalServerError;

        await httpContext.Response.WriteAsJsonAsync(
            new ApiErrorResponse
            {
                Success = false,
                Message = isNotFound || isConflict
                    ? exception.Message
                    : "Beklenmeyen bir hata oluştu.",
                ErrorCode = isNotFound
                    ? "NOT_FOUND"
                    : isConflict
                        ? "CONFLICT"
                    : "INTERNAL_SERVER_ERROR",
                TraceId = traceId
            },
            cancellationToken);

        return true;
    }
}
