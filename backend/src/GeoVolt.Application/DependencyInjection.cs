using GeoVolt.Application.Admin;
using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Auth;
using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Application.CandidatePoints;
using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.Regions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.SavedCandidatePoints;
using GeoVolt.Application.SavedCandidatePoints.Abstractions;
using Microsoft.Extensions.DependencyInjection;

namespace GeoVolt.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<ICandidatePointService, CandidatePointService>();
        services.AddScoped<IRegionService, RegionService>();
        services.AddScoped<ISavedCandidatePointService, SavedCandidatePointService>();

        return services;
    }
}
