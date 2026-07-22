namespace GeoVolt.Application.CostEstimations.Dtos;

// Maliyet tahmini için gerekli olan tüm çıktıları temsil eder.
public sealed class CostEstimationResultDto
{
    public double DistanceToTransformerMeters { get; set; }

    public decimal EstimatedCableLengthMeters { get; set; }

    public int ConnectorCount { get; set; }

    // Tek konnektörün cihaz maliyeti.
    public decimal UnitEquipmentCost { get; set; }

    // Seçilen konnektörlerin toplam cihaz maliyeti.
    public decimal EquipmentCost { get; set; }

    public decimal ElectricalInfrastructureCost { get; set; }

    public decimal BaseCivilWorksCost { get; set; }

    public decimal SlopeExtraCost { get; set; }

    public decimal AdjustedCivilWorksCost { get; set; }

    public decimal SubtotalCost { get; set; }

    // Tek konnektör için hesaplanan standart nihai maliyet.
    public decimal StandardEstimatedCost { get; set; }

    // Seçilen konnektör sayısına göre hesaplanan net maliyet.
    public decimal EstimatedCost { get; set; }

    public string CurrencyCode { get; set; } = string.Empty;

    public string CostModelVersion { get; set; } = string.Empty;
}