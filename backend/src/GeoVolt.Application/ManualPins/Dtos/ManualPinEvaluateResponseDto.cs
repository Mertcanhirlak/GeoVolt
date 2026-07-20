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

    // Firmanın seçtiği kurulum bilgileri.
    public string SystemType { get; set; } = string.Empty;

    public int PowerKw { get; set; }

    public string VenueType { get; set; } = string.Empty;

    // GIS üzerinden bulunan değerler.
    public double? SlopePercent { get; set; }

    public double? DistanceToTransformerMeters { get; set; }

    // Hesaplanan maliyet kırılımları.
    public decimal? EstimatedCableLengthMeters { get; set; }

    public decimal? EquipmentCost { get; set; }

    public decimal? ElectricalInfrastructureCost { get; set; }

    public decimal? BaseCivilWorksCost { get; set; }

    public decimal? SlopeExtraCost { get; set; }

    public decimal? AdjustedCivilWorksCost { get; set; }

    public decimal? SubtotalCost { get; set; }

    public decimal? EstimatedCost { get; set; }

    // Bütçe kontrolü.
    public decimal? BudgetMax { get; set; }

    public bool? IsWithinBudget { get; set; }

    // Kullanılan maliyet modelinin bilgileri.
    public string CurrencyCode { get; set; } = string.Empty;

    public string CostModelVersion { get; set; } = string.Empty;

    public string CostSource { get; set; } = string.Empty;

    public List<string> Warnings { get; set; } = [];

    public string Message { get; set; } = string.Empty;
}