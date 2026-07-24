using GeoVolt.Application.Common;

namespace GeoVolt.Api.Middleware;

public sealed class PasswordChangeEnforcementMiddleware
{
    private const string MustChangePasswordClaim = "mustChangePassword";
    private static readonly PathString ChangePasswordPath = new("/api/auth/change-password");
    private readonly RequestDelegate _next;

    public PasswordChangeEnforcementMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var mustChangePassword = context.User.Identity?.IsAuthenticated == true
            && context.User.HasClaim(MustChangePasswordClaim, "true");

        if (mustChangePassword && !context.Request.Path.Equals(ChangePasswordPath))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(
                ApiResponse<object>.Fail("Devam etmek için önce şifrenizi değiştirmelisiniz."));
            return;
        }

        await _next(context);
    }
}
