using GeoVolt.Application.Admin;
using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Auth;
using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Application.CandidatePoints;
using GeoVolt.Application.CandidatePoints.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using GeoVolt.Application.ChargingStations;
using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.Neighborhoods;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.Regions;
using GeoVolt.Application.Regions.Abstractions;

namespace GeoVolt.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(
        this IServiceCollection services)
    {
        // Kimlik doğrulama servis kaydı
        services.AddScoped<IAuthService, AuthService>();

        // Admin servis kaydı
        services.AddScoped<IAdminService, AdminService>();

        // Aday nokta servis kaydı
        services.AddScoped<ICandidatePointService, CandidatePointService>();

        // Region servis kaydı
        services.AddScoped<IRegionService, RegionService>();

        // Şarj istasyonu servis kaydı
        services.AddScoped<IChargingStationService, ChargingStationService>();

        // Mahalle servis kaydı
        services.AddScoped<INeighborhoodService, NeighborhoodService>();

        return services;
    }
}