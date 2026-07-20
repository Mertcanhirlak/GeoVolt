namespace GeoVolt.Application.CostEstimations.Dtos;
//maliyet tahmini için gerekli olan tüm çıktıları temsil eden DTO
public sealed class CostEstimationResultDto
{
    public double DistanceToTransformerMeters { get; set; }

    public decimal EstimatedCableLengthMeters { get; set; }

    public decimal EquipmentCost { get; set; }

    public decimal ElectricalInfrastructureCost { get; set; }

    public decimal BaseCivilWorksCost { get; set; }

    public decimal SlopeExtraCost { get; set; }

    public decimal AdjustedCivilWorksCost { get; set; }

    public decimal SubtotalCost { get; set; }

    public decimal EstimatedCost { get; set; }

    public string CurrencyCode { get; set; } = string.Empty;

    public string CostModelVersion { get; set; } = string.Empty;
}