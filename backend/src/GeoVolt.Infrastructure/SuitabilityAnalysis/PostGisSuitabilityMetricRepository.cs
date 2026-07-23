using System.Text.Json;
using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using GeoVolt.Domain.Constants;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.SuitabilityAnalysis;

public sealed partial class PostGisSuitabilityAnalysisRepository
{
    private const string MetricAlgorithmVersion = "metrics-v2";

    public async Task<SuitabilityMetricCalculationResult?> CalculateMetricsAsync(
        int analysisRunId,
        CancellationToken cancellationToken = default)
    {
        var analysisRun = await _dbContext.SuitabilityAnalysisRuns
            .FirstOrDefaultAsync(run => run.Id == analysisRunId, cancellationToken);

        if (analysisRun is null)
        {
            return null;
        }

        if (analysisRun.Status is not (
            AnalysisRunStatuses.GridReady or
            AnalysisRunStatuses.MetricsReady or
            AnalysisRunStatuses.Scored))
        {
            throw new ConflictException(
                $"Metrikler yalnızca {AnalysisRunStatuses.GridReady} veya " +
                $"{AnalysisRunStatuses.MetricsReady} ya da {AnalysisRunStatuses.Scored} " +
                "durumundaki çalışmalar için hesaplanabilir.");
        }

        var originalStatus = analysisRun.Status;
        var calculatedAtUtc = DateTime.UtcNow;
        var datasetCoverageVerified = IsDatasetCoverageVerified(
            analysisRun.DatasetSnapshotJson);

        analysisRun.Status = AnalysisRunStatuses.Running;
        analysisRun.ErrorMessage = null;
        await _dbContext.SaveChangesAsync(cancellationToken);

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var previousCommandTimeout = _dbContext.Database.GetCommandTimeout();
        _dbContext.Database.SetCommandTimeout(TimeSpan.FromMinutes(15));

        try
        {
            FormattableString metricSql = $"""
                DROP TABLE IF EXISTS pg_temp.tmp_suitability_metric_cells;
                DROP TABLE IF EXISTS pg_temp.tmp_transformers_metric;
                DROP TABLE IF EXISTS pg_temp.tmp_major_roads_metric;
                DROP TABLE IF EXISTS pg_temp.tmp_stations_metric;
                DROP TABLE IF EXISTS pg_temp.tmp_pois_metric;

                CREATE TEMP TABLE tmp_suitability_metric_cells ON COMMIT DROP AS
                SELECT
                    cell.id,
                    cell.neighborhood_id,
                    ST_Transform(
                        cell.representative_point,
                        {SuitabilityGridDefaults.MetricSrid}) AS point_metric
                FROM analysis.suitability_cells cell
                WHERE cell.analysis_run_id = {analysisRunId};

                CREATE UNIQUE INDEX ON tmp_suitability_metric_cells (id);
                CREATE INDEX ON tmp_suitability_metric_cells USING GIST (point_metric);

                CREATE TEMP TABLE tmp_transformers_metric ON COMMIT DROP AS
                SELECT
                    transformer."Id" AS id,
                    transformer."SourceId" AS source_id,
                    ST_Transform(
                        transformer."Location",
                        {SuitabilityGridDefaults.MetricSrid}) AS location_metric
                FROM gis.power_transformers transformer;

                CREATE INDEX ON tmp_transformers_metric USING GIST (location_metric);

                CREATE TEMP TABLE tmp_major_roads_metric ON COMMIT DROP AS
                SELECT
                    road."Id" AS id,
                    road."SourceId" AS source_id,
                    road."RoadType" AS road_type,
                    ST_Transform(
                        road."Geometry",
                        {SuitabilityGridDefaults.MetricSrid}) AS geometry_metric
                FROM gis.roads road
                WHERE road."RoadType" = ANY ({SuitabilityMetricDefaults.MajorRoadTypes});

                CREATE INDEX ON tmp_major_roads_metric USING GIST (geometry_metric);

                CREATE TEMP TABLE tmp_stations_metric ON COMMIT DROP AS
                SELECT
                    station.id,
                    station.source_station_number,
                    ST_Transform(
                        station.location,
                        {SuitabilityGridDefaults.MetricSrid}) AS location_metric
                FROM gis.charging_stations station
                WHERE station.is_active
                  AND station.access_type = 'Public';

                CREATE INDEX ON tmp_stations_metric USING GIST (location_metric);

                CREATE TEMP TABLE tmp_pois_metric ON COMMIT DROP AS
                SELECT
                    poi."Id" AS id,
                    ST_Transform(
                        poi."Location",
                        {SuitabilityGridDefaults.MetricSrid}) AS location_metric
                FROM gis.pois poi;

                CREATE INDEX ON tmp_pois_metric USING GIST (location_metric);

                ANALYZE tmp_suitability_metric_cells;
                ANALYZE tmp_transformers_metric;
                ANALYZE tmp_major_roads_metric;
                ANALYZE tmp_stations_metric;
                ANALYZE tmp_pois_metric;

                UPDATE analysis.suitability_cells cell
                SET
                    nearest_transformer_meters = transformer.distance_meters,
                    nearest_major_road_meters = road.distance_meters,
                    nearest_station_meters = station.distance_meters,
                    poi_count_300_meters = poi_counts.count_300,
                    poi_count_500_meters = poi_counts.count_500,
                    poi_count_1000_meters = poi_counts.count_1000,
                    slope_percent = ROUND(slope.value::numeric, 2),
                    population_density_per_square_kilometer =
                        CASE
                            WHEN neighborhood.id IS NULL
                              OR neighborhood.population IS NULL
                              OR ST_Area(ST_Transform(
                                    neighborhood.boundary,
                                    {SuitabilityGridDefaults.MetricSrid})) <= 0
                                THEN NULL
                            ELSE neighborhood.population /
                                (ST_Area(ST_Transform(
                                    neighborhood.boundary,
                                    {SuitabilityGridDefaults.MetricSrid})) / 1000000.0)
                        END,
                    suitability_score = NULL,
                    confidence_score = NULL,
                    evaluation_status = {SiteEvaluationStatuses.InsufficientData},
                    has_hard_exclusion = FALSE,
                    metric_details = jsonb_strip_nulls(jsonb_build_object(
                        'metricVersion', {MetricAlgorithmVersion},
                        'metricSrid', {SuitabilityGridDefaults.MetricSrid},
                        'distanceOrigin', 'cell-representative-point',
                        'nearestTransformerId', transformer.id,
                        'nearestTransformerSourceId', transformer.source_id,
                        'nearestMajorRoadId', road.id,
                        'nearestMajorRoadSourceId', road.source_id,
                        'nearestMajorRoadType', road.road_type,
                        'nearestStationId', station.id,
                        'nearestStationSourceNumber', station.source_station_number,
                        'poiRadiiMeters', jsonb_build_array(
                            {SuitabilityMetricDefaults.PoiNearRadiusMeters},
                            {SuitabilityMetricDefaults.PoiMediumRadiusMeters},
                            {SuitabilityMetricDefaults.PoiFarRadiusMeters}),
                        'populationMethod', 'neighborhood-population-per-square-kilometer',
                        'populationSourceNeighborhoodId', neighborhood.id,
                        'stationFilter', 'is_active=true;access_type=Public',
                        'slopeRasterFilename', slope.filename,
                        'slopeRasterSha256', slope.sha256,
                        'slopeRasterSrid', slope.source_srid,
                        'slopeSamplingMethod', 'nearest-valid-pixel-from-cell-representative-point',
                        'datasetCoverageVerified', {datasetCoverageVerified})),
                    reason_codes =
                        CASE WHEN transformer.distance_meters IS NULL
                            THEN jsonb_build_array({SiteEvaluationReasonCodes.TransformerDistanceMissing})
                            ELSE '[]'::jsonb END
                        || CASE WHEN road.distance_meters IS NULL
                            THEN jsonb_build_array({SiteEvaluationReasonCodes.MajorRoadDistanceMissing})
                            ELSE '[]'::jsonb END
                        || CASE WHEN station.distance_meters IS NULL
                            THEN jsonb_build_array({SiteEvaluationReasonCodes.StationDistanceMissing})
                            ELSE '[]'::jsonb END
                        || CASE WHEN poi_counts.count_500 IS NULL
                            THEN jsonb_build_array({SiteEvaluationReasonCodes.PoiMetricMissing})
                            ELSE '[]'::jsonb END
                        || CASE WHEN neighborhood.id IS NULL OR neighborhood.population IS NULL
                            THEN jsonb_build_array({SiteEvaluationReasonCodes.PopulationDensityMissing})
                            ELSE '[]'::jsonb END
                        || CASE
                            WHEN slope.value IS NULL
                              OR slope.value::text IN ('NaN', 'Infinity', '-Infinity')
                                THEN jsonb_build_array({SiteEvaluationReasonCodes.SlopeDataMissing})
                            ELSE '[]'::jsonb
                        END
                        || CASE WHEN road.distance_meters > {SuitabilityAdvisoryDefaults.MajorRoadWarningDistanceMeters}
                            THEN jsonb_build_array({SiteEvaluationReasonCodes.MajorRoadDistanceWarning})
                            ELSE '[]'::jsonb END
                        || CASE WHEN slope.value >= {SuitabilityAdvisoryDefaults.SteepSlopeWarningPercent}
                            THEN jsonb_build_array({SiteEvaluationReasonCodes.SteepSlopeWarning})
                            ELSE '[]'::jsonb END
                        || CASE WHEN NOT {datasetCoverageVerified}
                            THEN jsonb_build_array({SiteEvaluationReasonCodes.DatasetCoverageUnverified})
                            ELSE '[]'::jsonb END
                        || jsonb_build_array({SiteEvaluationReasonCodes.ScoringNotCalculated}),
                    calculated_at_utc = {calculatedAtUtc}
                FROM tmp_suitability_metric_cells metric_cell
                LEFT JOIN LATERAL (
                    SELECT
                        source.id,
                        source.source_id,
                        ST_Distance(source.location_metric, metric_cell.point_metric)
                            AS distance_meters
                    FROM tmp_transformers_metric source
                    ORDER BY source.location_metric <-> metric_cell.point_metric, source.id
                    LIMIT 1
                ) transformer ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        source.id,
                        source.source_id,
                        source.road_type,
                        ST_Distance(source.geometry_metric, metric_cell.point_metric)
                            AS distance_meters
                    FROM tmp_major_roads_metric source
                    ORDER BY source.geometry_metric <-> metric_cell.point_metric, source.id
                    LIMIT 1
                ) road ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        source.id,
                        source.source_station_number,
                        ST_Distance(source.location_metric, metric_cell.point_metric)
                            AS distance_meters
                    FROM tmp_stations_metric source
                    ORDER BY source.location_metric <-> metric_cell.point_metric, source.id
                    LIMIT 1
                ) station ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(*) FILTER (
                            WHERE ST_DWithin(
                                source.location_metric,
                                metric_cell.point_metric,
                                {SuitabilityMetricDefaults.PoiNearRadiusMeters}))::integer AS count_300,
                        COUNT(*) FILTER (
                            WHERE ST_DWithin(
                                source.location_metric,
                                metric_cell.point_metric,
                                {SuitabilityMetricDefaults.PoiMediumRadiusMeters}))::integer AS count_500,
                        COUNT(*)::integer AS count_1000
                    FROM tmp_pois_metric source
                    WHERE ST_DWithin(
                        source.location_metric,
                        metric_cell.point_metric,
                        {SuitabilityMetricDefaults.PoiFarRadiusMeters})
                ) poi_counts ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        ST_NearestValue(
                            tile.rast,
                            1,
                            metric_cell.point_metric,
                            TRUE) AS value,
                        tile.filename,
                        tile.sha256,
                        tile.source_srid
                    FROM gis.slope_raster_tiles tile
                    ORDER BY
                        ST_ConvexHull(tile.rast) <-> metric_cell.point_metric,
                        tile.rid
                    LIMIT 1
                ) slope ON TRUE
                LEFT JOIN gis.neighborhoods neighborhood
                    ON neighborhood.id = metric_cell.neighborhood_id
                WHERE cell.id = metric_cell.id;

                UPDATE analysis.analysis_runs run
                SET parameters = run.parameters || jsonb_build_object(
                    'metrics', jsonb_build_object(
                        'version', {MetricAlgorithmVersion},
                        'metricSrid', {SuitabilityGridDefaults.MetricSrid},
                        'distanceOrigin', 'cell-representative-point',
                        'majorRoadTypes', to_jsonb({SuitabilityMetricDefaults.MajorRoadTypes}::text[]),
                        'poiRadiiMeters', jsonb_build_array(
                            {SuitabilityMetricDefaults.PoiNearRadiusMeters},
                            {SuitabilityMetricDefaults.PoiMediumRadiusMeters},
                            {SuitabilityMetricDefaults.PoiFarRadiusMeters}),
                        'activePublicStationsOnly', TRUE,
                        'slopeRasterFilename', (
                            SELECT MIN(tile.filename)
                            FROM gis.slope_raster_tiles tile),
                        'slopeRasterSha256', (
                            SELECT MIN(tile.sha256)
                            FROM gis.slope_raster_tiles tile),
                        'slopeRasterSrid', (
                            SELECT MIN(tile.source_srid)
                            FROM gis.slope_raster_tiles tile),
                        'slopeSamplingMethod', 'nearest-valid-pixel-from-cell-representative-point',
                        'advisoryThresholds', jsonb_build_object(
                            'majorRoadWarningDistanceMeters',
                                {SuitabilityAdvisoryDefaults.MajorRoadWarningDistanceMeters},
                            'steepSlopeWarningPercent',
                                {SuitabilityAdvisoryDefaults.SteepSlopeWarningPercent},
                            'hardExclusionsApplied', FALSE),
                        'datasetCoverageVerified', {datasetCoverageVerified},
                        'calculatedAtUtc', {calculatedAtUtc}))
                WHERE run.id = {analysisRunId};
                """;

            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                metricSql,
                cancellationToken);

            var counts = await _dbContext.SuitabilityCells
                .AsNoTracking()
                .Where(cell => cell.AnalysisRunId == analysisRunId)
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    CellCount = group.Count(),
                    TransformerDistanceCount = group.Count(cell => cell.NearestTransformerMeters.HasValue),
                    MajorRoadDistanceCount = group.Count(cell => cell.NearestMajorRoadMeters.HasValue),
                    StationDistanceCount = group.Count(cell => cell.NearestStationMeters.HasValue),
                    PoiMetricCount = group.Count(cell => cell.PoiCount1000Meters.HasValue),
                    PopulationDensityCount = group.Count(cell => cell.PopulationDensityPerSquareKilometer.HasValue),
                    SlopeMetricCount = group.Count(cell => cell.SlopePercent.HasValue),
                    CalculatedCellCount = group.Count(cell => cell.CalculatedAtUtc.HasValue)
                })
                .SingleAsync(cancellationToken);

            if (counts.CellCount != analysisRun.CellCount ||
                counts.CalculatedCellCount != analysisRun.CellCount)
            {
                throw new InvalidOperationException(
                    "Metrik hesaplanan hücre sayısı analiz çalışmasının hücre sayısıyla uyuşmuyor.");
            }

            analysisRun.Status = AnalysisRunStatuses.MetricsReady;
            analysisRun.ErrorMessage = null;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new SuitabilityMetricCalculationResult(
                analysisRun.Id,
                analysisRun.Status,
                MetricAlgorithmVersion,
                counts.CellCount,
                counts.TransformerDistanceCount,
                counts.MajorRoadDistanceCount,
                counts.StationDistanceCount,
                counts.PoiMetricCount,
                counts.PopulationDensityCount,
                counts.SlopeMetricCount,
                datasetCoverageVerified,
                calculatedAtUtc);
        }
        catch (OperationCanceledException)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            analysisRun.Status = originalStatus;
            analysisRun.ErrorMessage = "Metrik hesaplama işlemi iptal edildi.";
            await _dbContext.SaveChangesAsync(CancellationToken.None);
            throw;
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            analysisRun.Status = originalStatus;
            var errorMessage = GetErrorMessage(exception);
            analysisRun.ErrorMessage = errorMessage.Length <= 4000
                ? errorMessage
                : errorMessage[..4000];
            await _dbContext.SaveChangesAsync(CancellationToken.None);
            throw;
        }
        finally
        {
            _dbContext.Database.SetCommandTimeout(previousCommandTimeout);
        }
    }

    private static bool IsDatasetCoverageVerified(string datasetSnapshotJson)
    {
        using var document = JsonDocument.Parse(datasetSnapshotJson);
        var layers = document.RootElement;

        return layers.ValueKind == JsonValueKind.Array &&
               layers.GetArrayLength() > 0 &&
               layers.EnumerateArray().All(layer =>
                   layer.TryGetProperty("coverageStatus", out var coverageStatus) &&
                   coverageStatus.GetString() == DatasetCoverageStatuses.Verified &&
                   layer.TryGetProperty("completenessStatus", out var completenessStatus) &&
                   completenessStatus.GetString() == DatasetCompletenessStatuses.Complete);
    }
}
