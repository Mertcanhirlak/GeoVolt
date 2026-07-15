using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Application.ManualPins.Dtos;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;

namespace GeoVolt.Application.ManualPins;

public sealed class ManualPinService : IManualPinService
{
    private readonly IRegionService _regionService;

    public ManualPinService(IRegionService regionService)
    {
        _regionService = regionService;
    }

    public async Task<ManualPinEvaluateResponseDto> EvaluateAsync(
        ManualPinEvaluateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var location = await _regionService.LocatePointAsync(
            request.RegionId,
            new RegionPointRequestDto
            {
                Latitude = request.Latitude!.Value,
                Longitude = request.Longitude!.Value
            },
            cancellationToken);

        return new ManualPinEvaluateResponseDto
        {
            IsValid = location.IsInsideRegion,
            RegionId = location.RegionId,
            RegionName = location.RegionName,
            NeighborhoodId = location.NeighborhoodId,
            NeighborhoodName = location.NeighborhoodName,
            Latitude = location.Latitude,
            Longitude = location.Longitude,
            EstimatedCost = null,
            CostSource = "not_available",
            Message = GetMessage(location)
        };
    }

    private static string GetMessage(LocateRegionPointResponseDto location)
    {
        if (!location.IsInsideRegion)
        {
            return "Seçilen nokta bölge sınırları dışında.";
        }

        return location.NeighborhoodId.HasValue
            ? "Manuel pin bölge ve mahalle sınırları içinde."
            : "Manuel pin bölge içinde ancak mahalle bilgisi bulunamadı.";
    }
}
