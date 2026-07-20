namespace GeoVolt.Domain.Entities;

public sealed class SlopeCostBand
{
    public int Id { get; set; }

    public decimal MinSlopePercent { get; set; }

    public decimal? MaxSlopePercent { get; set; }

    public decimal ExtraRate { get; set; }
}
