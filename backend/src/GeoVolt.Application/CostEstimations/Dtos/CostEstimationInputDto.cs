namespace GeoVolt.Application.CostEstimations.Dtos;
//maliyet tahmini için gerekli olan tüm girdileri temsil eden DTO
public sealed class CostEstimationInputDto
{
    // GIS verileri
    public double DistanceToTransformerMeters { get; set; }

    public double SlopePercent { get; set; }

    // Genel model ayarları
    public string CostModelVersion { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = string.Empty;

    public decimal RouteMultiplier { get; set; }

    public decimal RoundingStep { get; set; }

    // Güç profili değerleri
    public decimal EquipmentCost { get; set; }

    public decimal FixedElectricalInfrastructureCost { get; set; }

    public decimal CableUnitCostPerMeter { get; set; }

    public decimal FixedSiteCost { get; set; }

    public decimal TrenchRestorationUnitCostPerMeter { get; set; }

    public decimal RiskRate { get; set; }

    // Eğim ve mekân katsayıları
    public decimal SlopeExtraRate { get; set; }

    public decimal VenueMultiplier { get; set; }
}