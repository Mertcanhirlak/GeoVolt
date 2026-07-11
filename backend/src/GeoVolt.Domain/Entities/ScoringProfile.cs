namespace GeoVolt.Domain.Entities;

public sealed class ScoringProfile
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Version { get; set; } = string.Empty;

    public decimal DemandWeight { get; set; }

    public decimal EnergyWeight { get; set; }

    public decimal AccessWeight { get; set; }

    public decimal CompetitionWeight { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
