using GeoVolt.Application.Admin;
using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Auth;
using GeoVolt.Application.Auth.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using GeoVolt.Application.Regions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.ChargingStations;
using GeoVolt.Application.ChargingStations.Abstractions;

namespace GeoVolt.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminService, AdminService>();
        // Region servis implementasyonunu kaydeder
        services.AddScoped<IRegionService, RegionService>();
        // Şarj istasyonu servis kaydı
        services.AddScoped<IChargingStationService, ChargingStationService>();
        return services;
    }
}
