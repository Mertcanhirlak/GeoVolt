namespace GeoVolt.Application.ManualPins.Dtos;

public sealed class ManualPinEvaluateResponseDto
{
    public bool IsValid { get; set; }

    public int RegionId { get; set; }

    public string RegionName { get; set; } = string.Empty;

    public int? NeighborhoodId { get; set; }

    public string? NeighborhoodName { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public string SystemType { get; set; } = string.Empty;

    public int PowerKw { get; set; }

    public string VenueType { get; set; } = string.Empty;

    public double? SlopePercent { get; set; }

    public double? DistanceToTransformerMeters { get; set; }

    public double? EstimatedCableLengthMeters { get; set; }

    public decimal? EquipmentCost { get; set; }

    public decimal? ElectricalInfrastructureCost { get; set; }

    public decimal? BaseCivilWorksCost { get; set; }

    public decimal? SlopeExtraCost { get; set; }

    public decimal? AdjustedSiteCost { get; set; }

    public decimal? SubtotalCost { get; set; }

    public decimal? EstimatedCost { get; set; }

    public decimal? BudgetMax { get; set; }

    public bool? IsWithinBudget { get; set; }

    public string CostSource { get; set; } = string.Empty;

    public string CostConfidence { get; set; } = string.Empty;

    public List<string> Warnings { get; set; } = [];

    public string Message { get; set; } = string.Empty;
}