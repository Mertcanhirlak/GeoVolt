using GeoVolt.Application.CostEstimations.Abstractions;
using GeoVolt.Application.CostEstimations.Dtos;
using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Application.ManualPins.Dtos;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;

namespace GeoVolt.Application.ManualPins;

public sealed class ManualPinService : IManualPinService
{
    private readonly IRegionService _regionService;
    private readonly ITransformerRepository _transformerRepository;
    private readonly ISlopeRepository _slopeRepository;
    private readonly ICostConfigurationRepository _costConfigurationRepository;
    private readonly ICostEstimationService _costEstimationService;

    public ManualPinService(
        IRegionService regionService,
        ITransformerRepository transformerRepository,
        ISlopeRepository slopeRepository,
        ICostConfigurationRepository costConfigurationRepository,
        ICostEstimationService costEstimationService)
    {
        _regionService = regionService;
        _transformerRepository = transformerRepository;
        _slopeRepository = slopeRepository;
        _costConfigurationRepository = costConfigurationRepository;
        _costEstimationService = costEstimationService;
    }

    public async Task<ManualPinEvaluateResponseDto> EvaluateAsync(
        ManualPinEvaluateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var latitude = request.Latitude
            ?? throw new ArgumentException(
                "Latitude bilgisi zorunludur.",
                nameof(request));

        var longitude = request.Longitude
            ?? throw new ArgumentException(
                "Longitude bilgisi zorunludur.",
                nameof(request));

        var systemType =
            request.SystemType.Trim().ToUpperInvariant();

        var venueType =
            request.VenueType.Trim();

        // Pin seçilen bölgenin içinde mi kontrol edilir.
        var location = await _regionService.LocatePointAsync(
            request.RegionId,
            new RegionPointRequestDto
            {
                Latitude = latitude,
                Longitude = longitude
            },
            cancellationToken);

        if (!location.IsInsideRegion)
        {
            return CreateResponse(
                request,
                location,
                transformerDistance: null,
                slopePercent: null,
                estimatedCost: null,
                currencyCode: string.Empty,
                costModelVersion: string.Empty,
                costSource: "not_calculated",
                message: "Seçilen nokta bölge sınırları dışında.");
        }

        // Noktaya en yakın trafo mesafesi bulunur.
        var transformerDistance =
            await _transformerRepository.GetNearestDistanceMetersAsync(
                latitude,
                longitude,
                cancellationToken);

        // TIFF eğim verisinden pin noktasındaki yüzde eğim alınır.
        var slopePercent =
            await _slopeRepository.GetSlopePercentAsync(
                latitude,
                longitude,
                cancellationToken);

        if (!transformerDistance.HasValue || !slopePercent.HasValue)
        {
            return CreateResponse(
                request,
                location,
                transformerDistance,
                slopePercent,
                estimatedCost: null,
                currencyCode: string.Empty,
                costModelVersion: string.Empty,
                costSource: "gis_data_unavailable",
                message:
                    "Konum geçerli ancak trafo mesafesi veya eğim verisi bulunamadığı için maliyet hesaplanamadı.");
        }

        // Formülün genel ayarları alınır.
        var modelSetting =
            await _costConfigurationRepository.GetModelSettingAsync(
                cancellationToken);

        // AC/DC ve güç değerine uygun maliyet profili alınır.
        var costProfile =
            await _costConfigurationRepository.GetProfileAsync(
                systemType,
                request.PowerKw,
                cancellationToken);

        // Mekân türüne ait maliyet katsayısı alınır.
        var venueMultiplier =
            await _costConfigurationRepository.GetVenueMultiplierAsync(
                venueType,
                cancellationToken);

        // Gerçek eğim yüzdesine uygun maliyet aralığı bulunur.
        var slopeBand =
            await _costConfigurationRepository.GetSlopeBandAsync(
                Convert.ToDecimal(slopePercent.Value),
                cancellationToken);

        if (modelSetting is null
            || costProfile is null
            || venueMultiplier is null
            || slopeBand is null)
        {
            return CreateResponse(
                request,
                location,
                transformerDistance,
                slopePercent,
                estimatedCost: null,
                currencyCode: modelSetting?.CurrencyCode ?? string.Empty,
                costModelVersion: modelSetting?.Version ?? string.Empty,
                costSource: "cost_configuration_unavailable",
                message:
                    "Konum geçerli ancak maliyet katsayıları bulunamadığı için hesaplama yapılamadı.");
        }

        var input = new CostEstimationInputDto
        {
            DistanceToTransformerMeters =
                transformerDistance.Value,

            SlopePercent =
                slopePercent.Value,

            CostModelVersion =
                modelSetting.Version,

            CurrencyCode =
                modelSetting.CurrencyCode,

            RouteMultiplier =
                modelSetting.RouteMultiplier,

            RoundingStep =
                modelSetting.RoundingStep,

            EquipmentCost =
                costProfile.EquipmentCost,

            FixedElectricalInfrastructureCost =
                costProfile.FixedElectricalInfrastructureCost,

            CableUnitCostPerMeter =
                costProfile.CableUnitCostPerMeter,

            FixedSiteCost =
                costProfile.FixedSiteCost,

            TrenchRestorationUnitCostPerMeter =
                costProfile.TrenchRestorationUnitCostPerMeter,

            RiskRate =
                costProfile.RiskRate,

            SlopeExtraRate =
                slopeBand.ExtraRate,

            VenueMultiplier =
                venueMultiplier.Multiplier
        };

        // Saf matematiksel maliyet hesabı yapılır.
        var costResult =
            _costEstimationService.Calculate(input);

        return CreateResponse(
            request,
            location,
            transformerDistance,
            slopePercent,
            costResult.EstimatedCost,
            costResult.CurrencyCode,
            costResult.CostModelVersion,
            $"{costResult.CostModelVersion}-{costResult.CurrencyCode}",
            GetSuccessMessage(location));
    }

    private static ManualPinEvaluateResponseDto CreateResponse(
        ManualPinEvaluateRequestDto request,
        LocateRegionPointResponseDto location,
        double? transformerDistance,
        double? slopePercent,
        decimal? estimatedCost,
        string currencyCode,
        string costModelVersion,
        string costSource,
        string message)
    {
        bool? isWithinBudget = null;

        if (estimatedCost.HasValue && request.BudgetMax.HasValue)
        {
            isWithinBudget =
                estimatedCost.Value <= request.BudgetMax.Value;
        }

        var warnings = new List<string>();

        if (location.IsInsideRegion && !transformerDistance.HasValue)
        {
            warnings.Add(
                "En yakın trafo mesafesi bulunamadı.");
        }

        if (location.IsInsideRegion && !slopePercent.HasValue)
        {
            warnings.Add(
                "Eğim verisi bulunamadı.");
        }

        return new ManualPinEvaluateResponseDto
        {
            IsValid = location.IsInsideRegion,

            RegionId = location.RegionId,
            RegionName = location.RegionName,

            NeighborhoodId = location.NeighborhoodId,
            NeighborhoodName = location.NeighborhoodName,

            Latitude = location.Latitude,
            Longitude = location.Longitude,

            SystemType =
                request.SystemType.Trim().ToUpperInvariant(),

            PowerKw = request.PowerKw,

            VenueType =
                request.VenueType.Trim(),

            SlopePercent = slopePercent,

            DistanceToTransformerMeters =
                transformerDistance,

            EstimatedCost = estimatedCost,

            BudgetMax = request.BudgetMax,
            IsWithinBudget = isWithinBudget,

            CurrencyCode = currencyCode,
            CostModelVersion = costModelVersion,
            CostSource = costSource,

            Warnings = warnings,
            Message = message
        };
    }

    private static string GetSuccessMessage(
        LocateRegionPointResponseDto location)
    {
        return location.NeighborhoodId.HasValue
            ? "Manuel pin doğrulandı ve tahmini maliyet hesaplandı."
            : "Manuel pin bölge içinde. Mahalle bilgisi bulunamadı ancak tahmini maliyet hesaplandı.";
    }
}