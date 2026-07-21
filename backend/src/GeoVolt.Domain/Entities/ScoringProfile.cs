namespace GeoVolt.Domain.Entities;

public sealed class ScoringProfile
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Version { get; set; } = string.Empty;

    public decimal TransformerWeight { get; set; }

    public decimal MajorRoadWeight { get; set; }

    public decimal PoiWeight { get; set; }

    public decimal PopulationWeight { get; set; }

    public decimal StationGapWeight { get; set; }

    public decimal SlopeWeight { get; set; }

    public decimal RecommendationPercentile { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
