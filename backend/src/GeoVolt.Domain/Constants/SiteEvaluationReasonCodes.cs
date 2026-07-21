namespace GeoVolt.Domain.Constants;

public static class SiteEvaluationReasonCodes
{
    public const string DatasetCoverageUnverified = "DATASET_COVERAGE_UNVERIFIED";
    public const string ScoringNotCalculated = "SCORING_NOT_CALCULATED";

    public const string TransformerDistanceMissing = "TRANSFORMER_DISTANCE_MISSING";
    public const string MajorRoadDistanceMissing = "MAJOR_ROAD_DISTANCE_MISSING";
    public const string StationDistanceMissing = "STATION_DISTANCE_MISSING";
    public const string PoiMetricMissing = "POI_METRIC_MISSING";
    public const string PopulationDensityMissing = "POPULATION_DENSITY_MISSING";
    public const string SlopeDataMissing = "SLOPE_DATA_MISSING";

    public const string MajorRoadDistanceWarning = "MAJOR_ROAD_DISTANCE_WARNING";
    public const string SteepSlopeWarning = "STEEP_SLOPE_WARNING";
}
