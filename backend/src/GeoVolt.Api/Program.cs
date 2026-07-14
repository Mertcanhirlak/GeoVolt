using System.Text;
using GeoVolt.Api.ExceptionHandling;
using GeoVolt.Application;
using GeoVolt.Application.Auth.Options;
using GeoVolt.Domain.Constants;
using GeoVolt.Infrastructure;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "App_Data", "DataProtectionKeys")));

builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

var jwtOptions = GetJwtOptions(builder.Configuration);
var frontendUrls = GetFrontendUrls(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .WithOrigins(frontendUrls)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var authorization = context.Request.Headers.Authorization.ToString();
                const string duplicatedBearerPrefix = "Bearer Bearer ";

                if (authorization.StartsWith(duplicatedBearerPrefix, StringComparison.OrdinalIgnoreCase))
                {
                    context.Token = authorization[duplicatedBearerPrefix.Length..].Trim();
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    foreach (var permission in PermissionNames.All)
    {
        options.AddPolicy(permission.Name, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.RequireAssertion(context =>
                CanUseManagementApi(context)
                && context.User.HasClaim("permission", permission.Name));
        });
    }

    options.AddPolicy("user.catalog.read", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
            CanUseManagementApi(context)
            && (
            context.User.HasClaim("permission", PermissionNames.UserRead)
            || context.User.HasClaim("permission", PermissionNames.UserRoleAssign)));
    });

    options.AddPolicy("role.catalog.read", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
            CanUseManagementApi(context)
            && (
            context.User.HasClaim("permission", PermissionNames.RoleRead)
            || context.User.HasClaim("permission", PermissionNames.UserRoleAssign)
            || context.User.HasClaim("permission", PermissionNames.PermissionAssign)));
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "GeoVolt API",
        Version = "v1",
        Description = "GeoVolt backend API"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Sadece JWT token degerini girin. Swagger 'Bearer' on ekini otomatik ekler."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
    });
});

var app = builder.Build();

app.UseExceptionHandler(_ => { });

await SeedDefaultAdminAsync(app);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        success = true,
        message = "GeoVolt API çalışıyor.",
        utcTime = DateTime.UtcNow
    });
})
.WithTags("Health");

app.MapControllers();

app.Run();

static JwtOptions GetJwtOptions(IConfiguration configuration)
{
    var options = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
    var environmentSecret = configuration["JWT_SECRET_KEY"];

    if (!string.IsNullOrWhiteSpace(environmentSecret))
    {
        options.SecretKey = environmentSecret;
    }

    if (options.SecretKey.Length < 32)
    {
        throw new InvalidOperationException("JWT secret key must be at least 32 characters. Set Jwt:SecretKey or JWT_SECRET_KEY.");
    }

    return options;
}

static string[] GetFrontendUrls(IConfiguration configuration)
{
    var configuredUrls =
        configuration["FRONTEND_URLS"]
        ?? configuration["FRONTEND_URL"]
        ?? "http://localhost:5173;http://127.0.0.1:5173";

    return configuredUrls
        .Split([';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

static async Task SeedDefaultAdminAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseSeeder");

    try
    {
        var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
        await seeder.SeedDefaultAdminAsync();
    }
    catch (Exception exception)
    {
        logger.LogWarning(exception, "Default admin seed skipped. Run database migration and restart the API.");
    }
}

static bool CanUseManagementApi(AuthorizationHandlerContext context)
{
    return !context.User.IsInRole(UserRoles.CompanyUser);
}
