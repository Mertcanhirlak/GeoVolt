using System.Text.Json;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using GeoVolt.Domain.Constants;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.SuitabilityAnalysis;

public sealed partial class PostGisSuitabilityAnalysisRepository
{
    public async Task<SuitabilityLocationEvaluationResponse> EvaluateLocationAsync(
        double latitude,
        double longitude,
        int recommendationLimit,
        CancellationToken cancellationToken = default)
    {
        var context = await _dbContext.Database
            .SqlQuery<LocationContextRow>($"""
                WITH input AS (
                    SELECT ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326) AS point
                )
                SELECT
                    district.source_id AS "DistrictSourceId",
                    district.name AS "DistrictName",
                    scored_run.id AS "AnalysisRunId"
                FROM gis.districts district
                CROSS JOIN input
                LEFT JOIN LATERAL (
                    SELECT run.id
                    FROM analysis.analysis_runs run
                    WHERE run.study_area_district_id = district.id
                      AND run.status = {AnalysisRunStatuses.Scored}
                    ORDER BY run.completed_at_utc DESC NULLS LAST, run.id DESC
                    LIMIT 1
                ) scored_run ON TRUE
                WHERE ST_Covers(district.boundary, input.point)
                ORDER BY district.id
                LIMIT 1
                """)
            .FirstOrDefaultAsync(cancellationToken);

        if (context is null)
        {
            return new SuitabilityLocationEvaluationResponse(
                latitude,
                longitude,
                false,
                null,
                null,
                null,
                SiteEvaluationStatuses.OutsideStudyArea,
                "Seçilen konum desteklenen çalışma alanı dışındadır.",
                null,
                []);
        }

        if (!context.AnalysisRunId.HasValue)
        {
            return new SuitabilityLocationEvaluationResponse(
                latitude,
                longitude,
                true,
                context.DistrictSourceId,
                context.DistrictName,
                null,
                SiteEvaluationStatuses.InsufficientData,
                "Bu çalışma alanı için puanlanmış bir analiz bulunmuyor.",
                null,
                []);
        }

        var analysisRunId = context.AnalysisRunId.Value;
        var selectedRow = await _dbContext.Database
            .SqlQuery<SuitabilityLocationCellRow>($"""
                WITH input AS (
                    SELECT ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326) AS point
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
                    NULL::integer AS "RecommendationRank",
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
                CROSS JOIN input
                LEFT JOIN gis.regions region ON region.id = cell.region_id
                LEFT JOIN gis.neighborhoods neighborhood ON neighborhood.id = cell.neighborhood_id
                WHERE cell.analysis_run_id = {analysisRunId}
                  AND ST_Covers(cell.boundary, input.point)
                ORDER BY
                    ST_Distance(cell.representative_point, input.point),
                    cell.id
                LIMIT 1
                """)
            .FirstOrDefaultAsync(cancellationToken);

        var selectedCellId = selectedRow?.CellId;
        var recommendationRows = await _dbContext.Database
            .SqlQuery<SuitabilityLocationCellRow>($"""
                WITH input AS (
                    SELECT
                        ST_Transform(
                            ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326),
                            {SuitabilityGridDefaults.MetricSrid}) AS point_metric
                ),
                recommendations AS (
                    SELECT
                        cell.id AS cell_id,
                        cell.cell_i,
                        cell.cell_j,
                        cell.evaluation_status,
                        cell.has_hard_exclusion,
                        COALESCE(
                            (cell.metric_details -> 'scoring' ->> 'provisionalRecommendation')::boolean,
                            FALSE) AS is_provisional_recommendation,
                        COALESCE(
                            (cell.metric_details -> 'scoring' ->> 'datasetCoverageVerified')::boolean,
                            FALSE) AS dataset_coverage_verified,
                        cell.suitability_score,
                        cell.confidence_score,
                        ROUND(ST_Distance(
                            ST_Transform(cell.boundary, {SuitabilityGridDefaults.MetricSrid}),
                            input.point_metric)::numeric, 2)::double precision AS distance_meters,
                        region.source_id AS region_source_id,
                        region.name AS region_name,
                        neighborhood.source_id AS neighborhood_source_id,
                        neighborhood.name AS neighborhood_name,
                        ST_AsGeoJSON(cell.boundary)::text AS boundary_geo_json,
                        cell.nearest_transformer_meters,
                        cell.nearest_major_road_meters,
                        cell.nearest_station_meters,
                        cell.poi_count_300_meters,
                        cell.poi_count_500_meters,
                        cell.poi_count_1000_meters,
                        cell.population_density_per_square_kilometer,
                        cell.slope_percent,
                        (cell.metric_details -> 'scoring' ->> 'transformerScore')::numeric
                            AS transformer_score,
                        (cell.metric_details -> 'scoring' ->> 'majorRoadScore')::numeric
                            AS major_road_score,
                        (cell.metric_details -> 'scoring' ->> 'poiScore')::numeric AS poi_score,
                        (cell.metric_details -> 'scoring' ->> 'populationScore')::numeric
                            AS population_score,
                        (cell.metric_details -> 'scoring' ->> 'stationGapScore')::numeric
                            AS station_gap_score,
                        (cell.metric_details -> 'scoring' ->> 'slopeScore')::numeric AS slope_score,
                        cell.reason_codes::text AS reason_codes_json
                    FROM analysis.suitability_cells cell
                    CROSS JOIN input
                    LEFT JOIN gis.regions region ON region.id = cell.region_id
                    LEFT JOIN gis.neighborhoods neighborhood ON neighborhood.id = cell.neighborhood_id
                    WHERE cell.analysis_run_id = {analysisRunId}
                      AND cell.suitability_score IS NOT NULL
                      AND NOT cell.has_hard_exclusion
                      AND cell.evaluation_status <> {SiteEvaluationStatuses.HardExclusion}
                      AND cell.nearest_transformer_meters IS NOT NULL
                      AND cell.nearest_major_road_meters IS NOT NULL
                      AND cell.nearest_station_meters IS NOT NULL
                      AND cell.poi_count_500_meters IS NOT NULL
                      AND cell.population_density_per_square_kilometer IS NOT NULL
                      AND cell.slope_percent IS NOT NULL
                      AND COALESCE(
                          (cell.metric_details -> 'scoring' ->> 'provisionalRecommendation')::boolean,
                          FALSE)
                      AND ({selectedCellId}::bigint IS NULL OR cell.id <> {selectedCellId})
                ),
                ranked AS (
                    SELECT
                        recommendation.*,
                        ROW_NUMBER() OVER (
                            ORDER BY
                                recommendation.distance_meters,
                                recommendation.suitability_score DESC,
                                recommendation.cell_id)::integer AS recommendation_rank
                    FROM recommendations recommendation
                )
                SELECT
                    ranked.cell_id AS "CellId",
                    ranked.cell_i AS "CellI",
                    ranked.cell_j AS "CellJ",
                    ranked.evaluation_status AS "EvaluationStatus",
                    ranked.has_hard_exclusion AS "HasHardExclusion",
                    ranked.is_provisional_recommendation AS "IsProvisionalRecommendation",
                    ranked.dataset_coverage_verified AS "DatasetCoverageVerified",
                    ranked.suitability_score AS "SuitabilityScore",
                    ranked.confidence_score AS "ConfidenceScore",
                    ranked.distance_meters AS "DistanceMeters",
                    ranked.recommendation_rank AS "RecommendationRank",
                    ranked.region_source_id AS "RegionSourceId",
                    ranked.region_name AS "RegionName",
                    ranked.neighborhood_source_id AS "NeighborhoodSourceId",
                    ranked.neighborhood_name AS "NeighborhoodName",
                    ranked.boundary_geo_json AS "BoundaryGeoJson",
                    ranked.nearest_transformer_meters AS "NearestTransformerMeters",
                    ranked.nearest_major_road_meters AS "NearestMajorRoadMeters",
                    ranked.nearest_station_meters AS "NearestStationMeters",
                    ranked.poi_count_300_meters AS "PoiCount300Meters",
                    ranked.poi_count_500_meters AS "PoiCount500Meters",
                    ranked.poi_count_1000_meters AS "PoiCount1000Meters",
                    ranked.population_density_per_square_kilometer AS "PopulationDensityPerSquareKilometer",
                    ranked.slope_percent AS "SlopePercent",
                    ranked.transformer_score AS "TransformerScore",
                    ranked.major_road_score AS "MajorRoadScore",
                    ranked.poi_score AS "PoiScore",
                    ranked.population_score AS "PopulationScore",
                    ranked.station_gap_score AS "StationGapScore",
                    ranked.slope_score AS "SlopeScore",
                    ranked.reason_codes_json AS "ReasonCodesJson"
                FROM ranked
                WHERE ranked.recommendation_rank <= {recommendationLimit}
                ORDER BY ranked.recommendation_rank
                """)
            .ToListAsync(cancellationToken);

        var selectedCell = selectedRow is null ? null : MapLocationCell(selectedRow);
        var recommendations = recommendationRows
            .Select(MapLocationCell)
            .ToList();
        var evaluationStatus = selectedCell?.EvaluationStatus
            ?? SiteEvaluationStatuses.InsufficientData;

        return new SuitabilityLocationEvaluationResponse(
            latitude,
            longitude,
            true,
            context.DistrictSourceId,
            context.DistrictName,
            analysisRunId,
            evaluationStatus,
            GetLocationEvaluationMessage(selectedCell),
            selectedCell,
            recommendations);
    }

    private static SuitabilityLocationCellResponse MapLocationCell(
        SuitabilityLocationCellRow row)
    {
        using var boundaryDocument = JsonDocument.Parse(row.BoundaryGeoJson);
        var reasonCodes = JsonSerializer.Deserialize<string[]>(row.ReasonCodesJson) ?? [];

        return new SuitabilityLocationCellResponse(
            row.CellId,
            row.CellI,
            row.CellJ,
            row.EvaluationStatus,
            row.HasHardExclusion,
            row.IsProvisionalRecommendation,
            row.DatasetCoverageVerified,
            row.SuitabilityScore,
            row.ConfidenceScore,
            row.DistanceMeters,
            row.RecommendationRank,
            row.RegionSourceId,
            row.RegionName,
            row.NeighborhoodSourceId,
            row.NeighborhoodName,
            boundaryDocument.RootElement.Clone(),
            new SuitabilityMetricResponse(
                row.NearestTransformerMeters,
                row.NearestMajorRoadMeters,
                row.NearestStationMeters,
                row.PoiCount300Meters,
                row.PoiCount500Meters,
                row.PoiCount1000Meters,
                row.PopulationDensityPerSquareKilometer,
                row.SlopePercent),
            new SuitabilityScoreBreakdownResponse(
                row.TransformerScore,
                row.MajorRoadScore,
                row.PoiScore,
                row.PopulationScore,
                row.StationGapScore,
                row.SlopeScore),
            reasonCodes);
    }

    private static string GetLocationEvaluationMessage(
        SuitabilityLocationCellResponse? selectedCell)
    {
        if (selectedCell is null)
        {
            return "Seçilen konum için analiz hücresi bulunamadı.";
        }

        if (selectedCell.HasHardExclusion)
        {
            return "Seçilen alanda kesin engel bulunuyor; en yakın alternatifler listelendi.";
        }

        if (selectedCell.IsProvisionalRecommendation)
        {
            return "Seçilen alan geçici öneriler arasındadır; en yakın alternatifler de listelendi.";
        }

        if (!selectedCell.DatasetCoverageVerified)
        {
            return "Veri kapsamı henüz doğrulanmadığı için karar geçicidir; en yakın öneriler listelendi.";
        }

        return selectedCell.EvaluationStatus == SiteEvaluationStatuses.Candidate
            ? "Seçilen alan uygunluk adayıdır."
            : "Seçilen alan öneri eşiğinin altında; en yakın alternatifler listelendi.";
    }

    private sealed class LocationContextRow
    {
        public int DistrictSourceId { get; init; }

        public string DistrictName { get; init; } = string.Empty;

        public int? AnalysisRunId { get; init; }
    }

    private sealed class SuitabilityLocationCellRow
    {
        public long CellId { get; init; }
        public int CellI { get; init; }
        public int CellJ { get; init; }
        public string EvaluationStatus { get; init; } = string.Empty;
        public bool HasHardExclusion { get; init; }
        public bool IsProvisionalRecommendation { get; init; }
        public bool DatasetCoverageVerified { get; init; }
        public decimal? SuitabilityScore { get; init; }
        public decimal? ConfidenceScore { get; init; }
        public double? DistanceMeters { get; init; }
        public int? RecommendationRank { get; init; }
        public int? RegionSourceId { get; init; }
        public string? RegionName { get; init; }
        public int? NeighborhoodSourceId { get; init; }
        public string? NeighborhoodName { get; init; }
        public string BoundaryGeoJson { get; init; } = string.Empty;
        public double? NearestTransformerMeters { get; init; }
        public double? NearestMajorRoadMeters { get; init; }
        public double? NearestStationMeters { get; init; }
        public int? PoiCount300Meters { get; init; }
        public int? PoiCount500Meters { get; init; }
        public int? PoiCount1000Meters { get; init; }
        public double? PopulationDensityPerSquareKilometer { get; init; }
        public decimal? SlopePercent { get; init; }
        public decimal? TransformerScore { get; init; }
        public decimal? MajorRoadScore { get; init; }
        public decimal? PoiScore { get; init; }
        public decimal? PopulationScore { get; init; }
        public decimal? StationGapScore { get; init; }
        public decimal? SlopeScore { get; init; }
        public string ReasonCodesJson { get; init; } = "[]";
    }
}
