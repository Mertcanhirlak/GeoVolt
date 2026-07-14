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

    public decimal? EstimatedCost { get; set; }

    public string CostSource { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}
