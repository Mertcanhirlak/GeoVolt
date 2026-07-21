namespace GeoVolt.Application.SuitabilityAnalysis.Models;

public sealed record SuitabilityMetricCalculationResult(
    int AnalysisRunId,
    string Status,
    string MetricVersion,
    int CellCount,
    int TransformerDistanceCount,
    int MajorRoadDistanceCount,
    int StationDistanceCount,
    int PoiMetricCount,
    int PopulationDensityCount,
    int SlopeMetricCount,
    bool DatasetCoverageVerified,
    DateTime CalculatedAtUtc);
