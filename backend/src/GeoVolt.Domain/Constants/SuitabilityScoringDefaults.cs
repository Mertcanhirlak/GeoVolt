namespace GeoVolt.Domain.Constants;

public static class SuitabilityScoringDefaults
{
    public const string ProfileName = "GeoVolt Relative Suitability";
    public const string ProfileVersion = "score-v1";

    public const decimal TransformerWeight = 0.25m;
    public const decimal MajorRoadWeight = 0.20m;
    public const decimal PoiWeight = 0.20m;
    public const decimal PopulationWeight = 0.15m;
    public const decimal StationGapWeight = 0.10m;
    public const decimal SlopeWeight = 0.10m;
    public const decimal RecommendationPercentile = 0.90m;
}
