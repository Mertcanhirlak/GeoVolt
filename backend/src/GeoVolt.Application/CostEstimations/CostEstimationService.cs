using GeoVolt.Application.CostEstimations.Abstractions;
using GeoVolt.Application.CostEstimations.Dtos;

namespace GeoVolt.Application.CostEstimations;

public sealed class CostEstimationService : ICostEstimationService
{
    public CostEstimationResultDto Calculate(
        CostEstimationInputDto input)
    {
        ArgumentNullException.ThrowIfNull(input);

        ValidateInput(input);

        // Trafoya olan düz mesafeyi tahmini kablo uzunluğuna çevirir.
        var transformerDistanceMeters =
            Convert.ToDecimal(input.DistanceToTransformerMeters);

        var estimatedCableLengthMeters =
            transformerDistanceMeters * input.RouteMultiplier;

        // Sabit elektrik altyapısı ve kablo maliyeti hesaplanır.
        var electricalInfrastructureCost =
            input.FixedElectricalInfrastructureCost
            + estimatedCableLengthMeters
            * input.CableUnitCostPerMeter;

        // Sabit saha, kazı ve restorasyon maliyeti hesaplanır.
        var baseCivilWorksCost =
            input.FixedSiteCost
            + estimatedCableLengthMeters
            * input.TrenchRestorationUnitCostPerMeter;

        // Eğim nedeniyle oluşan ek inşaat maliyeti hesaplanır.
        var slopeExtraCost =
            baseCivilWorksCost * input.SlopeExtraRate;

        // Mekân katsayısı yalnızca inşaat maliyetine uygulanır.
        var adjustedCivilWorksCost =
            (baseCivilWorksCost + slopeExtraCost)
            * input.VenueMultiplier;

        // Cost profile içindeki cihaz maliyeti tek konnektör içindir.
        var unitEquipmentCost =
            input.EquipmentCost;

        // Seçilen konnektör sayısına göre toplam cihaz maliyeti.
        var totalEquipmentCost =
            unitEquipmentCost * input.ConnectorCount;

        // Tek konnektör için standart ara toplam.
        var standardSubtotalCost =
            unitEquipmentCost
            + electricalInfrastructureCost
            + adjustedCivilWorksCost;

        // Tek konnektör için standart nihai maliyet.
        var standardUnroundedEstimatedCost =
            standardSubtotalCost * (1m + input.RiskRate);

        var standardEstimatedCost =
            RoundToStep(
                standardUnroundedEstimatedCost,
                input.RoundingStep);

        // Seçilen konnektör sayısına göre net ara toplam.
        var subtotalCost =
            totalEquipmentCost
            + electricalInfrastructureCost
            + adjustedCivilWorksCost;

        // Risk oranı net ara toplama uygulanır.
        var unroundedEstimatedCost =
            subtotalCost * (1m + input.RiskRate);

        var estimatedCost =
            RoundToStep(
                unroundedEstimatedCost,
                input.RoundingStep);

        return new CostEstimationResultDto
        {
            DistanceToTransformerMeters =
                input.DistanceToTransformerMeters,

            EstimatedCableLengthMeters =
                estimatedCableLengthMeters,

            ConnectorCount =
                input.ConnectorCount,

            UnitEquipmentCost =
                unitEquipmentCost,

            EquipmentCost =
                totalEquipmentCost,

            ElectricalInfrastructureCost =
                electricalInfrastructureCost,

            BaseCivilWorksCost =
                baseCivilWorksCost,

            SlopeExtraCost =
                slopeExtraCost,

            AdjustedCivilWorksCost =
                adjustedCivilWorksCost,

            SubtotalCost =
                subtotalCost,

            StandardEstimatedCost =
                standardEstimatedCost,

            EstimatedCost =
                estimatedCost,

            CurrencyCode =
                input.CurrencyCode.Trim().ToUpperInvariant(),

            CostModelVersion =
                input.CostModelVersion.Trim()
        };
    }

    private static decimal RoundToStep(
        decimal value,
        decimal roundingStep)
    {
        return Math.Round(
                   value / roundingStep,
                   0,
                   MidpointRounding.AwayFromZero)
               * roundingStep;
    }

    private static void ValidateInput(
        CostEstimationInputDto input)
    {
        if (!double.IsFinite(input.DistanceToTransformerMeters)
            || input.DistanceToTransformerMeters < 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input.DistanceToTransformerMeters),
                "Trafo mesafesi sıfırdan küçük olamaz.");
        }

        if (!double.IsFinite(input.SlopePercent)
            || input.SlopePercent < 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input.SlopePercent),
                "Eğim yüzdesi sıfırdan küçük olamaz.");
        }

        if (input.ConnectorCount is < 1 or > 20)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input.ConnectorCount),
                "Konnektör sayısı 1 ile 20 arasında olmalıdır.");
        }

        if (input.RouteMultiplier <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input.RouteMultiplier),
                "Güzergâh katsayısı sıfırdan büyük olmalıdır.");
        }

        if (input.RoundingStep <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input.RoundingStep),
                "Yuvarlama adımı sıfırdan büyük olmalıdır.");
        }

        if (input.VenueMultiplier <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input.VenueMultiplier),
                "Mekân katsayısı sıfırdan büyük olmalıdır.");
        }

        if (input.SlopeExtraRate is < 0 or > 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input.SlopeExtraRate),
                "Eğim ek oranı 0 ile 1 arasında olmalıdır.");
        }

        if (input.RiskRate is < 0 or > 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input.RiskRate),
                "Risk oranı 0 ile 1 arasında olmalıdır.");
        }

        if (input.EquipmentCost < 0
            || input.FixedElectricalInfrastructureCost < 0
            || input.CableUnitCostPerMeter < 0
            || input.FixedSiteCost < 0
            || input.TrenchRestorationUnitCostPerMeter < 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(input),
                "Maliyet değerleri sıfırdan küçük olamaz.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(
            input.CurrencyCode);

        ArgumentException.ThrowIfNullOrWhiteSpace(
            input.CostModelVersion);
    }
}