namespace GeoVolt.Domain.Entities;

public sealed class VenueCostMultiplier
{
    public int Id { get; set; }

    public string VenueType { get; set; } = string.Empty;

    public decimal Multiplier { get; set; }
}
