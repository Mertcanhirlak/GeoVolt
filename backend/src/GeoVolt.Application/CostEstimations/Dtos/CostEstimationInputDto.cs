namespace GeoVolt.Application.CostEstimations.Dtos;

// Maliyet tahmini için gerekli olan tüm girdileri temsil eder.
public sealed class CostEstimationInputDto
{
    // GIS verileri
    public double DistanceToTransformerMeters { get; set; }

    public double SlopePercent { get; set; }

    // Kurulum bilgileri
    public int ConnectorCount { get; set; }

    // Genel model ayarları
    public string CostModelVersion { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = string.Empty;

    public decimal RouteMultiplier { get; set; }

    public decimal RoundingStep { get; set; }

    // Tek konnektör için güç profili değerleri
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