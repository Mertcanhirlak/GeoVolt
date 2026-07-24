using GeoVolt.Application.SuitabilityAnalysis.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.SuitabilityAnalysis;

public sealed partial class PostGisSuitabilityAnalysisRepository
{
    public async Task<SuitabilityAnalysisMapResult?> GetMapCellsAsync(
        int analysisRunId,
        decimal? minimumScore,
        string? evaluationStatus,
        bool onlyRecommended,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var run = await _dbContext.SuitabilityAnalysisRuns
            .AsNoTracking()
            .Include(item => item.StudyAreaDistrict)
            .FirstOrDefaultAsync(item => item.Id == analysisRunId, cancellationToken);

        if (run is null)
        {
            return null;
        }

        var normalizedStatus = string.IsNullOrWhiteSpace(evaluationStatus)
            ? null
            : evaluationStatus.Trim().ToUpperInvariant();

        var matchingCellCount = await _dbContext.Database
            .SqlQuery<int>($"""
                SELECT COUNT(*)::integer AS "Value"
                FROM analysis.suitability_cells cell
                WHERE cell.analysis_run_id = {analysisRunId}
                  AND ({minimumScore}::numeric IS NULL OR cell.suitability_score >= {minimumScore})
                  AND ({normalizedStatus}::text IS NULL OR cell.evaluation_status = {normalizedStatus})
                  AND (
                      NOT {onlyRecommended}
                      OR COALESCE(
                          (cell.metric_details -> 'scoring' ->> 'provisionalRecommendation')::boolean,
                          FALSE))
                """)
            .SingleAsync(cancellationToken);

        var rows = await _dbContext.Database
            .SqlQuery<SuitabilityLocationCellRow>($"""
                WITH filtered AS (
                    SELECT
                        cell.*,
                        ROW_NUMBER() OVER (
                            ORDER BY cell.suitability_score DESC NULLS LAST, cell.id)::integer AS display_rank
                    FROM analysis.suitability_cells cell
                    WHERE cell.analysis_run_id = {analysisRunId}
                      AND ({minimumScore}::numeric IS NULL OR cell.suitability_score >= {minimumScore})
                      AND ({normalizedStatus}::text IS NULL OR cell.evaluation_status = {normalizedStatus})
                      AND (
                          NOT {onlyRecommended}
                          OR COALESCE(
                              (cell.metric_details -> 'scoring' ->> 'provisionalRecommendation')::boolean,
                              FALSE))
                )
                SELECT
                    cell.id AS "CellId",
                    cell.cell_i AS "CellI",
                    cell.cell_j AS "CellJ",
                    cell.evaluation_status AS "EvaluationStatus",
                    cell.has_hard_exclusion AS "HasHardExclusion",
                    COALESCE(
                        (cell.metric_details -> 'scoring' ->> 'provisionalRecommendation')::boolean,
                        FALSE) AS "IsProvisionalRecommendation",
                    COALESCE(
                        (cell.metric_details -> 'scoring' ->> 'datasetCoverageVerified')::boolean,
                        FALSE) AS "DatasetCoverageVerified",
                    cell.suitability_score AS "SuitabilityScore",
                    cell.confidence_score AS "ConfidenceScore",
                    0::double precision AS "DistanceMeters",
                    cell.display_rank AS "RecommendationRank",
                    region.source_id AS "RegionSourceId",
                    region.name AS "RegionName",
                    neighborhood.source_id AS "NeighborhoodSourceId",
                    neighborhood.name AS "NeighborhoodName",
                    ST_AsGeoJSON(cell.boundary)::text AS "BoundaryGeoJson",
                    cell.nearest_transformer_meters AS "NearestTransformerMeters",
                    cell.nearest_major_road_meters AS "NearestMajorRoadMeters",
                    cell.nearest_station_meters AS "NearestStationMeters",
                    cell.poi_count_300_meters AS "PoiCount300Meters",
                    cell.poi_count_500_meters AS "PoiCount500Meters",
                    cell.poi_count_1000_meters AS "PoiCount1000Meters",
                    cell.population_density_per_square_kilometer AS "PopulationDensityPerSquareKilometer",
                    cell.slope_percent AS "SlopePercent",
                    (cell.metric_details -> 'scoring' ->> 'transformerScore')::numeric AS "TransformerScore",
                    (cell.metric_details -> 'scoring' ->> 'majorRoadScore')::numeric AS "MajorRoadScore",
                    (cell.metric_details -> 'scoring' ->> 'poiScore')::numeric AS "PoiScore",
                    (cell.metric_details -> 'scoring' ->> 'populationScore')::numeric AS "PopulationScore",
                    (cell.metric_details -> 'scoring' ->> 'stationGapScore')::numeric AS "StationGapScore",
                    (cell.metric_details -> 'scoring' ->> 'slopeScore')::numeric AS "SlopeScore",
                    cell.reason_codes::text AS "ReasonCodesJson"
                FROM filtered cell
                LEFT JOIN gis.regions region ON region.id = cell.region_id
                LEFT JOIN gis.neighborhoods neighborhood ON neighborhood.id = cell.neighborhood_id
                ORDER BY cell.display_rank
                LIMIT {limit}
                """)
            .ToListAsync(cancellationToken);

        var cells = rows.Select(MapLocationCell).ToList();
        var extremeRows = await _dbContext.Database
            .SqlQuery<SuitabilityLocationCellRow>($"""
                WITH extremes AS (
                    (
                        SELECT cell.id
                        FROM analysis.suitability_cells cell
                        WHERE cell.analysis_run_id = {analysisRunId}
                          AND cell.suitability_score IS NOT NULL
                        ORDER BY cell.suitability_score DESC, cell.id
                        LIMIT 1
                    )
                    UNION
                    (
                        SELECT cell.id
                        FROM analysis.suitability_cells cell
                        WHERE cell.analysis_run_id = {analysisRunId}
                          AND cell.suitability_score IS NOT NULL
                        ORDER BY cell.suitability_score ASC, cell.id
                        LIMIT 1
                    )
                )
                SELECT
                    cell.id AS "CellId",
                    cell.cell_i AS "CellI",
                    cell.cell_j AS "CellJ",
                    cell.evaluation_status AS "EvaluationStatus",
                    cell.has_hard_exclusion AS "HasHardExclusion",
                    COALESCE(
                        (cell.metric_details -> 'scoring' ->> 'provisionalRecommendation')::boolean,
                        FALSE) AS "IsProvisionalRecommendation",
                    COALESCE(
                        (cell.metric_details -> 'scoring' ->> 'datasetCoverageVerified')::boolean,
                        FALSE) AS "DatasetCoverageVerified",
                    cell.suitability_score AS "SuitabilityScore",
                    cell.confidence_score AS "ConfidenceScore",
                    0::double precision AS "DistanceMeters",
                    0::integer AS "RecommendationRank",
                    region.source_id AS "RegionSourceId",
                    region.name AS "RegionName",
                    neighborhood.source_id AS "NeighborhoodSourceId",
                    neighborhood.name AS "NeighborhoodName",
                    ST_AsGeoJSON(cell.boundary)::text AS "BoundaryGeoJson",
                    cell.nearest_transformer_meters AS "NearestTransformerMeters",
                    cell.nearest_major_road_meters AS "NearestMajorRoadMeters",
                    cell.nearest_station_meters AS "NearestStationMeters",
                    cell.poi_count_300_meters AS "PoiCount300Meters",
                    cell.poi_count_500_meters AS "PoiCount500Meters",
                    cell.poi_count_1000_meters AS "PoiCount1000Meters",
                    cell.population_density_per_square_kilometer AS "PopulationDensityPerSquareKilometer",
                    cell.slope_percent AS "SlopePercent",
                    (cell.metric_details -> 'scoring' ->> 'transformerScore')::numeric AS "TransformerScore",
                    (cell.metric_details -> 'scoring' ->> 'majorRoadScore')::numeric AS "MajorRoadScore",
                    (cell.metric_details -> 'scoring' ->> 'poiScore')::numeric AS "PoiScore",
                    (cell.metric_details -> 'scoring' ->> 'populationScore')::numeric AS "PopulationScore",
                    (cell.metric_details -> 'scoring' ->> 'stationGapScore')::numeric AS "StationGapScore",
                    (cell.metric_details -> 'scoring' ->> 'slopeScore')::numeric AS "SlopeScore",
                    cell.reason_codes::text AS "ReasonCodesJson"
                FROM analysis.suitability_cells cell
                JOIN extremes ON extremes.id = cell.id
                LEFT JOIN gis.regions region ON region.id = cell.region_id
                LEFT JOIN gis.neighborhoods neighborhood ON neighborhood.id = cell.neighborhood_id
                ORDER BY cell.suitability_score DESC, cell.id
                """)
            .ToListAsync(cancellationToken);

        var extremeCells = extremeRows.Select(MapLocationCell).ToList();
        var highestScoreCell = extremeCells.FirstOrDefault();
        var lowestScoreCell = extremeCells.LastOrDefault();

        return new SuitabilityAnalysisMapResult(
            run.Id,
            run.StudyAreaDistrict.SourceId,
            run.StudyAreaDistrict.Name,
            run.Status,
            run.GridEdgeMeters,
            run.CellCount,
            matchingCellCount,
            cells.Count,
            highestScoreCell,
            lowestScoreCell,
            cells);
    }
}
