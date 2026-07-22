using GeoVolt.Application.Admin;
using GeoVolt.Application.Admin.Abstractions;
using GeoVolt.Application.Auth;
using GeoVolt.Application.Auth.Abstractions;
using GeoVolt.Application.CandidatePoints;
using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.ChargingStations;
using GeoVolt.Application.ChargingStations.Abstractions;
using GeoVolt.Application.Neighborhoods;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.ManualPins;
using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Application.Regions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.SavedCandidatePoints;
using GeoVolt.Application.SavedCandidatePoints.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using GeoVolt.Application.CostEstimations;
using GeoVolt.Application.CostEstimations.Abstractions;

namespace GeoVolt.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(
        this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<ICandidatePointService, CandidatePointService>();
        services.AddScoped<IRegionService, RegionService>();
        services.AddScoped<ISavedCandidatePointService, SavedCandidatePointService>();
        services.AddScoped<IChargingStationService, ChargingStationService>();
        services.AddScoped<INeighborhoodService, NeighborhoodService>();
        services.AddScoped<IManualPinService, ManualPinService>();
        services.AddScoped<ICostEstimationService, CostEstimationService>();
        services.AddScoped<ISuitabilityAnalysisService, SuitabilityAnalysisService>();

        return services;
    }
}
