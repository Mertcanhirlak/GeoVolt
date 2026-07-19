using System.Text.Json;
using GeoVolt.Application.SuitabilityAnalysis.Abstractions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.SuitabilityAnalysis;

public sealed class PostGisSuitabilityAnalysisRepository : ISuitabilityAnalysisRepository
{
    private const string GridAlgorithmVersion = "grid-v1";

    private readonly GeoVoltDbContext _dbContext;

    public PostGisSuitabilityAnalysisRepository(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SuitabilityGridGenerationResult?> GenerateGridAsync(
        int districtSourceId,
        int gridEdgeMeters,
        CancellationToken cancellationToken = default)
    {
        var district = await _dbContext.Districts
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.SourceId == districtSourceId,
                cancellationToken);

        if (district is null)
        {
            return null;
        }

        var datasetSnapshot = await CreateDatasetSnapshotAsync(cancellationToken);
        var startedAtUtc = DateTime.UtcNow;
        var analysisRun = new SuitabilityAnalysisRun
        {
            StudyAreaDistrictId = district.Id,
            Status = AnalysisRunStatuses.Running,
            AlgorithmVersion = GridAlgorithmVersion,
            GridEdgeMeters = gridEdgeMeters,
            MetricSrid = SuitabilityGridDefaults.MetricSrid,
            StorageSrid = SuitabilityGridDefaults.StorageSrid,
            DatasetSnapshotJson = datasetSnapshot.Json,
            ParametersJson = JsonSerializer.Serialize(new
            {
                gridEdgeMeters,
                metricSrid = SuitabilityGridDefaults.MetricSrid,
                storageSrid = SuitabilityGridDefaults.StorageSrid,
                boundaryHandling = "clip-to-district",
                administrativeAssignment = "representative-point-with-largest-overlap-fallback"
            }),
            StartedAtUtc = startedAtUtc
        };

        _dbContext.SuitabilityAnalysisRuns.Add(analysisRun);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var previousCommandTimeout = _dbContext.Database.GetCommandTimeout();
        _dbContext.Database.SetCommandTimeout(TimeSpan.FromMinutes(2));

        try
        {
            FormattableString gridSql = $"""
                WITH district_metric AS (
                    SELECT ST_Transform(district.boundary, {SuitabilityGridDefaults.MetricSrid}) AS boundary
                    FROM gis.districts district
                    WHERE district.id = {district.Id}
                ),
                raw_cells AS (
                    SELECT
                        hex.i AS cell_i,
                        hex.j AS cell_j,
                        ST_Intersection(hex.geom, district.boundary) AS clipped_boundary
                    FROM district_metric district
                    CROSS JOIN LATERAL ST_HexagonGrid({gridEdgeMeters}, district.boundary) AS hex
                    WHERE ST_Intersects(hex.geom, district.boundary)
                ),
                polygon_cells AS (
                    SELECT
                        cell_i,
                        cell_j,
                        ST_Multi(
                            ST_CollectionExtract(
                                ST_MakeValid(clipped_boundary),
                                3)) AS boundary_metric
                    FROM raw_cells
                    WHERE NOT ST_IsEmpty(clipped_boundary)
                ),
                prepared_cells AS (
                    SELECT
                        cell_i,
                        cell_j,
                        boundary_metric,
                        ST_PointOnSurface(boundary_metric) AS representative_point_metric,
                        ST_Area(boundary_metric) AS area_square_meters
                    FROM polygon_cells
                    WHERE NOT ST_IsEmpty(boundary_metric)
                      AND ST_Area(boundary_metric) > 0
                ),
                storage_cells AS (
                    SELECT
                        cell_i,
                        cell_j,
                        boundary_metric,
                        ST_Transform(boundary_metric, {SuitabilityGridDefaults.StorageSrid}) AS boundary_storage,
                        ST_Transform(
                            representative_point_metric,
                            {SuitabilityGridDefaults.StorageSrid}) AS representative_point_storage,
                        area_square_meters
                    FROM prepared_cells
                )
                INSERT INTO analysis.suitability_cells (
                    analysis_run_id,
                    cell_i,
                    cell_j,
                    boundary,
                    representative_point,
                    area_square_meters,
                    region_id,
                    neighborhood_id,
                    evaluation_status,
                    has_hard_exclusion,
                    reason_codes)
                SELECT
                    {analysisRun.Id},
                    cell.cell_i,
                    cell.cell_j,
                    cell.boundary_storage,
                    cell.representative_point_storage,
                    cell.area_square_meters,
                    COALESCE(region_point_match.region_id, region_overlap_match.region_id),
                    COALESCE(
                        neighborhood_point_match.neighborhood_id,
                        neighborhood_overlap_match.neighborhood_id),
                    {SiteEvaluationStatuses.InsufficientData},
                    FALSE,
                    '["METRICS_NOT_CALCULATED"]'::jsonb
                FROM storage_cells cell
                LEFT JOIN LATERAL (
                    SELECT region.id AS region_id
                    FROM gis.regions region
                    WHERE region.district_id = {district.Id}
                      AND ST_Covers(
                          region.boundary,
                          cell.representative_point_storage)
                    ORDER BY region.id
                    LIMIT 1
                ) region_point_match ON TRUE
                LEFT JOIN LATERAL (
                    SELECT region.id AS region_id
                    FROM gis.regions region
                    WHERE region_point_match.region_id IS NULL
                      AND region.district_id = {district.Id}
                      AND ST_Intersects(region.boundary, cell.boundary_storage)
                    ORDER BY
                        ST_Area(
                            ST_Intersection(
                                ST_Transform(
                                    region.boundary,
                                    {SuitabilityGridDefaults.MetricSrid}),
                                cell.boundary_metric)) DESC,
                        region.id
                    LIMIT 1
                ) region_overlap_match ON TRUE
                LEFT JOIN LATERAL (
                    SELECT neighborhood.id AS neighborhood_id
                    FROM gis.neighborhoods neighborhood
                    WHERE neighborhood.region_id = COALESCE(
                              region_point_match.region_id,
                              region_overlap_match.region_id)
                      AND ST_Covers(
                          neighborhood.boundary,
                          cell.representative_point_storage)
                    ORDER BY neighborhood.id
                    LIMIT 1
                ) neighborhood_point_match ON TRUE
                LEFT JOIN LATERAL (
                    SELECT neighborhood.id AS neighborhood_id
                    FROM gis.neighborhoods neighborhood
                    WHERE neighborhood_point_match.neighborhood_id IS NULL
                      AND neighborhood.region_id = COALESCE(
                              region_point_match.region_id,
                              region_overlap_match.region_id)
                      AND ST_Intersects(neighborhood.boundary, cell.boundary_storage)
                    ORDER BY
                        ST_Area(
                            ST_Intersection(
                                ST_Transform(
                                    neighborhood.boundary,
                                    {SuitabilityGridDefaults.MetricSrid}),
                                cell.boundary_metric)) DESC,
                        neighborhood.id
                    LIMIT 1
                ) neighborhood_overlap_match ON TRUE;
                """;

            var insertedCellCount = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                gridSql,
                cancellationToken);

            var matchCounts = await _dbContext.SuitabilityCells
                .AsNoTracking()
                .Where(cell => cell.AnalysisRunId == analysisRun.Id)
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    CellCount = group.Count(),
                    RegionMatchedCellCount = group.Count(cell => cell.RegionId.HasValue),
                    NeighborhoodMatchedCellCount = group.Count(cell => cell.NeighborhoodId.HasValue)
                })
                .SingleAsync(cancellationToken);

            if (insertedCellCount != matchCounts.CellCount)
            {
                throw new InvalidOperationException(
                    "PostGIS hücre ekleme sayısı ile doğrulama sayısı uyuşmuyor.");
            }

            analysisRun.CellCount = matchCounts.CellCount;
            analysisRun.Status = AnalysisRunStatuses.GridReady;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new SuitabilityGridGenerationResult(
                analysisRun.Id,
                district.SourceId,
                district.Name,
                analysisRun.Status,
                analysisRun.AlgorithmVersion,
                analysisRun.GridEdgeMeters,
                matchCounts.CellCount,
                matchCounts.RegionMatchedCellCount,
                matchCounts.NeighborhoodMatchedCellCount,
                datasetSnapshot.LayerCount);
        }
        catch (OperationCanceledException)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            analysisRun.Status = AnalysisRunStatuses.Cancelled;
            analysisRun.CompletedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(CancellationToken.None);
            throw;
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            analysisRun.Status = AnalysisRunStatuses.Failed;
            analysisRun.CompletedAtUtc = DateTime.UtcNow;
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

    private async Task<DatasetSnapshot> CreateDatasetSnapshotAsync(
        CancellationToken cancellationToken)
    {
        var promotedImports = await _dbContext.DatasetImports
            .AsNoTracking()
            .Include(datasetImport => datasetImport.Coverage)
            .Where(datasetImport => datasetImport.Status == DatasetImportStatuses.Promoted)
            .ToListAsync(cancellationToken);

        var latestImports = promotedImports
            .GroupBy(datasetImport => datasetImport.DatasetName, StringComparer.OrdinalIgnoreCase)
            .Select(group => group
                .OrderByDescending(datasetImport => datasetImport.ImportedAtUtc)
                .First())
            .OrderBy(datasetImport => datasetImport.DatasetName)
            .Select(datasetImport => new
            {
                datasetCode = datasetImport.DatasetName,
                datasetImportId = datasetImport.Id,
                datasetImport.Sha256,
                datasetImport.SourceDateUtc,
                datasetImport.ImportedAtUtc,
                datasetImport.FeatureCount,
                datasetImport.SourceSrid,
                datasetImport.TargetSrid,
                coverageStatus = datasetImport.Coverage?.CoverageStatus
                    ?? DatasetCoverageStatuses.Unknown,
                completenessStatus = datasetImport.Coverage?.CompletenessStatus
                    ?? DatasetCompletenessStatuses.Unknown,
                qualityScore = datasetImport.Coverage?.QualityScore,
                isAuthoritative = datasetImport.Coverage?.IsAuthoritative ?? false
            })
            .ToArray();

        return new DatasetSnapshot(
            JsonSerializer.Serialize(latestImports),
            latestImports.Length);
    }

    private sealed record DatasetSnapshot(string Json, int LayerCount);

    private static string GetErrorMessage(Exception exception)
    {
        var baseException = exception.GetBaseException();
        return $"{baseException.GetType().Name}: {baseException.Message}";
    }
}
