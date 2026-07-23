using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.CostEstimations.Dtos;

public sealed class UpdateCostProfileRequest
{
    private const string MaximumCost = "9999999999999999";

    [Range(typeof(decimal), "0", MaximumCost)]
    public decimal EquipmentCost { get; init; }

    [Range(typeof(decimal), "0", MaximumCost)]
    public decimal FixedElectricalInfrastructureCost { get; init; }

    [Range(typeof(decimal), "0", MaximumCost)]
    public decimal CableUnitCostPerMeter { get; init; }

    [Range(typeof(decimal), "0", MaximumCost)]
    public decimal FixedSiteCost { get; init; }

    [Range(typeof(decimal), "0", MaximumCost)]
    public decimal TrenchRestorationUnitCostPerMeter { get; init; }

    [Range(typeof(decimal), "0", "1")]
    public decimal RiskRate { get; init; }
}
