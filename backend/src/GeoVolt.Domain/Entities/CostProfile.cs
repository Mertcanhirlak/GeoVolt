namespace GeoVolt.Domain.Entities;

public sealed class CostProfile
{
    public int Id { get; set; }

    public string SystemType { get; set; } = string.Empty;

    public int PowerKw { get; set; }

    public decimal EquipmentCost { get; set; }

    public decimal FixedElectricalInfrastructureCost { get; set; }

    public decimal CableUnitCostPerMeter { get; set; }

    public decimal FixedSiteCost { get; set; }

    public decimal TrenchRestorationUnitCostPerMeter { get; set; }

    public decimal RiskRate { get; set; }
}
