namespace GeoVolt.Application.CostEstimations.Dtos;

public sealed class CostEstimationInputDto
{
    public string SystemType { get; set; } = string.Empty;

    public int PowerKw { get; set; }

    public string VenueType { get; set; } = string.Empty;

    public double SlopePercent { get; set; }

    public double DistanceToTransformerMeters { get; set; }
}