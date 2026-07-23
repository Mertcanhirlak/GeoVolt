namespace GeoVolt.Application.CostEstimations.Dtos;

public sealed record CostProfileResponse(
    int Id,
    string SystemType,
    int PowerKw,
    decimal EquipmentCost,
    decimal FixedElectricalInfrastructureCost,
    decimal CableUnitCostPerMeter,
    decimal FixedSiteCost,
    decimal TrenchRestorationUnitCostPerMeter,
    decimal RiskRate);
