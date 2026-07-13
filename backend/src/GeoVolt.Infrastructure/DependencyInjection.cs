using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Application.Auth.Options;
using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.DataImports.Abstractions;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.SavedCandidatePoints.Abstractions;
using GeoVolt.Infrastructure.Admin;
using GeoVolt.Infrastructure.Auth;
using GeoVolt.Infrastructure.CandidatePoints;
using GeoVolt.Infrastructure.ChargingStations;
using GeoVolt.Infrastructure.DataImports;
using GeoVolt.Infrastructure.Neighborhoods;
using GeoVolt.Infrastructure.Options;
using GeoVolt.Infrastructure.Persistence;
using GeoVolt.Infrastructure.Regions;
using GeoVolt.Infrastructure.SavedCandidatePoints;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GeoVolt.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString =
            configuration["DATABASE_CONNECTION_STRING"]
            ?? configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Database connection string is missing. Set DATABASE_CONNECTION_STRING or ConnectionStrings:DefaultConnection.");
        }

        services.Configure<JwtOptions>(options =>
        {
            var jwtSection = configuration.GetSection(JwtOptions.SectionName);
            var environmentSecret = configuration["JWT_SECRET_KEY"];

            options.Issuer = jwtSection["Issuer"] ?? options.Issuer;
            options.Audience = jwtSection["Audience"] ?? options.Audience;
            options.SecretKey = jwtSection["SecretKey"] ?? options.SecretKey;

            if (int.TryParse(jwtSection["ExpirationMinutes"], out var expirationMinutes))
            {
                options.ExpirationMinutes = expirationMinutes;
            }

            if (!string.IsNullOrWhiteSpace(environmentSecret))
            {
                options.SecretKey = environmentSecret;
            }
        });

        services.Configure<DefaultAdminOptions>(options =>
        {
            var adminSection = configuration.GetSection(DefaultAdminOptions.SectionName);

            options.FullName = adminSection["FullName"] ?? options.FullName;
            options.Email = adminSection["Email"] ?? options.Email;
            options.Password = adminSection["Password"] ?? options.Password;
        });

        services.AddDbContext<GeoVoltDbContext>(options =>
        {
            options.UseNpgsql(
                connectionString,
                npgsqlOptions => npgsqlOptions.UseNetTopologySuite());
        });

        services.AddScoped<IAdminRepository, AdminRepository>();
        services.AddScoped<ICandidatePointRepository, MockCandidatePointRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<DatabaseSeeder>();
        services.AddScoped<IRegionRepository, RegionRepository>();
        services.AddScoped<ISavedCandidatePointRepository, SavedCandidatePointRepository>();
        services.AddScoped<IChargingStationRepository, ChargingStationRepository>();
        services.AddScoped<INeighborhoodRepository, NeighborhoodRepository>();
        services.AddScoped<IDataImportValidationService, GeoJsonDataImportValidationService>();
        services.AddScoped<IDataImportStagingService, GeoJsonDataImportStagingService>();

        return services;
    }
}
