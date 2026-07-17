namespace GeoVolt.Domain.Entities;

public sealed class CostModelSetting
{
    public int Id { get; set; }

    public string Version { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = string.Empty;

    public decimal RouteMultiplier { get; set; }

    public decimal RoundingStep { get; set; }

    public DateTime UpdatedAtUtc { get; set; }
}
