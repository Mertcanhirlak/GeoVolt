using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Application.ManualPins.Dtos;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;

namespace GeoVolt.Application.ManualPins;

public sealed class ManualPinService : IManualPinService
{
    private readonly IRegionService _regionService;

    public ManualPinService(
        IRegionService regionService)
    {
        _regionService = regionService;
    }

    public async Task<ManualPinEvaluateResponseDto?> EvaluateAsync(
        ManualPinEvaluateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        // Mevcut locate-point mantığını kullanır.
        var location = await _regionService.LocatePointAsync(
            request.RegionId,
            new RegionPointRequestDto
            {
                Latitude = request.Latitude,
                Longitude = request.Longitude
            },
            cancellationToken);

        if (location is null)
        {
            throw new NotFoundException("Bölge bulunamadı.");
        }

        // Pin seçilen bölgenin dışındadır.
        if (!location.IsInsideRegion)
        {
            return new ManualPinEvaluateResponseDto
            {
                IsValid = false,
                RegionId = location.RegionId,
                RegionName = location.RegionName,
                NeighborhoodId = null,
                NeighborhoodName = null,
                Latitude = location.Latitude,
                Longitude = location.Longitude,
                EstimatedCost = null,
                CostSource = "not_available",
                Message = "Seçilen nokta bölge sınırları dışında."
            };
        }

        // Gerçek maliyet verisi henüz bulunmuyor.
        return new ManualPinEvaluateResponseDto
        {
            IsValid = true,
            RegionId = location.RegionId,
            RegionName = location.RegionName,
            NeighborhoodId = location.NeighborhoodId,
            NeighborhoodName = location.NeighborhoodName,
            Latitude = location.Latitude,
            Longitude = location.Longitude,
            EstimatedCost = null,
            CostSource = "not_available",
            Message = location.NeighborhoodId.HasValue
                ? "Manuel pin bölge ve mahalle sınırları içinde."
                : "Manuel pin bölge içinde ancak mahalle bilgisi bulunamadı."
        };
    }
}