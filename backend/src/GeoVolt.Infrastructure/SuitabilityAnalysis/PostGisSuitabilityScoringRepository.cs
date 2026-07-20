using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.SuitabilityAnalysis.Models;
using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.SuitabilityAnalysis;

public sealed partial class PostGisSuitabilityAnalysisRepository
{
    public async Task<SuitabilityScoringResult?> CalculateScoresAsync(
        int analysisRunId,
        CancellationToken cancellationToken = default)
    {
        var analysisRun = await _dbContext.SuitabilityAnalysisRuns
            .FirstOrDefaultAsync(run => run.Id == analysisRunId, cancellationToken);

        if (analysisRun is null)
        {
            return null;
        }

        if (analysisRun.Status is not (AnalysisRunStatuses.MetricsReady or AnalysisRunStatuses.Scored))
        {
            throw new ConflictException(
                $"Puanlar yalnızca {AnalysisRunStatuses.MetricsReady} veya " +
                $"{AnalysisRunStatuses.Scored} durumundaki çalışmalar için hesaplanabilir.");
        }

        var metricCompleteness = await _dbContext.SuitabilityCells
            .AsNoTracking()
            .Where(cell => cell.AnalysisRunId == analysisRunId)
            .GroupBy(_ => 1)
            .Select(group => new
            {
                CellCount = group.Count(),
                CompleteMetricCount = group.Count(cell =>
                    cell.NearestTransformerMeters.HasValue &&
                    cell.NearestMajorRoadMeters.HasValue &&
                    cell.NearestStationMeters.HasValue &&
                    cell.PoiCount500Meters.HasValue &&
                    cell.PopulationDensityPerSquareKilometer.HasValue &&
                    cell.SlopePercent.HasValue)
            })
            .SingleAsync(cancellationToken);

        if (metricCompleteness.CellCount != analysisRun.CellCount ||
            metricCompleteness.CompleteMetricCount != analysisRun.CellCount)
        {
            throw new ConflictException(
                "Puanlama için gerekli metriklerin tamamı bütün hücrelerde hesaplanmış olmalıdır.");
        }

        var profile = await GetOrCreateActiveScoringProfileAsync(cancellationToken);
        var originalStatus = analysisRun.Status;
        var calculatedAtUtc = DateTime.UtcNow;
        var datasetCoverageVerified = IsDatasetCoverageVerified(
            analysisRun.DatasetSnapshotJson);

        analysisRun.Status = AnalysisRunStatuses.Running;
        analysisRun.ScoringProfileId = profile.Id;
        analysisRun.ErrorMessage = null;
        await _dbContext.SaveChangesAsync(cancellationToken);

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var previousCommandTimeout = _dbContext.Database.GetCommandTimeout();
        _dbContext.Database.SetCommandTimeout(TimeSpan.FromMinutes(2));

        try
        {
            FormattableString scoringSql = $"""
                WITH component_scores AS (
                    SELECT
                        cell.id,
                        ROUND((100 * (1 - PERCENT_RANK() OVER (
                            ORDER BY cell.nearest_transformer_meters)))::numeric, 2)
                            AS transformer_score,
                        ROUND((100 * (1 - PERCENT_RANK() OVER (
                            ORDER BY cell.nearest_major_road_meters)))::numeric, 2)
                            AS major_road_score,
                        ROUND((100 * PERCENT_RANK() OVER (
                            ORDER BY cell.poi_count_500_meters))::numeric, 2)
                            AS poi_score,
                        ROUND((100 * PERCENT_RANK() OVER (
                            ORDER BY cell.population_density_per_square_kilometer))::numeric, 2)
                            AS population_score,
                        ROUND((100 * PERCENT_RANK() OVER (
                            ORDER BY cell.nearest_station_meters))::numeric, 2)
                            AS station_gap_score,
                        ROUND((100 * (1 - PERCENT_RANK() OVER (
                            ORDER BY cell.slope_percent)))::numeric, 2)
                            AS slope_score
                    FROM analysis.suitability_cells cell
                    WHERE cell.analysis_run_id = {analysisRunId}
                ),
                weighted_scores AS (
                    SELECT
                        component.*,
                        ROUND((
                            component.transformer_score * {profile.TransformerWeight} +
                            component.major_road_score * {profile.MajorRoadWeight} +
                            component.poi_score * {profile.PoiWeight} +
                            component.population_score * {profile.PopulationWeight} +
                            component.station_gap_score * {profile.StationGapWeight} +
                            component.slope_score * {profile.SlopeWeight})::numeric, 2) AS total_score
                    FROM component_scores component
                ),
                ranked_scores AS (
                    SELECT
                        weighted.*,
                        PERCENT_RANK() OVER (ORDER BY weighted.total_score) AS score_percentile
                    FROM weighted_scores weighted
                )
                UPDATE analysis.suitability_cells cell
                SET
                    suitability_score = ranked.total_score,
                    confidence_score = NULL,
                    evaluation_status = CASE
                        WHEN cell.has_hard_exclusion THEN {SiteEvaluationStatuses.HardExclusion}
                        WHEN NOT {datasetCoverageVerified} THEN {SiteEvaluationStatuses.InsufficientData}
                        WHEN ranked.score_percentile >= {profile.RecommendationPercentile}
                            THEN {SiteEvaluationStatuses.Candidate}
                        ELSE {SiteEvaluationStatuses.LowSuitability}
                    END,
                    reason_codes = jsonb_path_query_array(
                        cell.reason_codes,
                        '$[*] ? (@ != "SCORING_NOT_CALCULATED" && @ != "DATASET_COVERAGE_UNVERIFIED")')
                        || CASE
                            WHEN {datasetCoverageVerified} THEN '[]'::jsonb
                            ELSE '["DATASET_COVERAGE_UNVERIFIED"]'::jsonb
                        END,
                    metric_details = cell.metric_details || jsonb_build_object(
                        'scoring', jsonb_build_object(
                            'version', {profile.Version},
                            'profileId', {profile.Id},
                            'normalization', 'within-run-percentile-rank',
                            'transformerScore', ranked.transformer_score,
                            'majorRoadScore', ranked.major_road_score,
                            'poiScore', ranked.poi_score,
                            'populationScore', ranked.population_score,
                            'stationGapScore', ranked.station_gap_score,
                            'slopeScore', ranked.slope_score,
                            'scorePercentile', ROUND(ranked.score_percentile::numeric, 6),
                            'provisionalRecommendation',
                                ranked.score_percentile >= {profile.RecommendationPercentile},
                            'datasetCoverageVerified', {datasetCoverageVerified})),
                    calculated_at_utc = {calculatedAtUtc}
                FROM ranked_scores ranked
                WHERE cell.id = ranked.id;

                UPDATE analysis.analysis_runs run
                SET parameters = run.parameters || jsonb_build_object(
                    'scoring', jsonb_build_object(
                        'version', {profile.Version},
                        'profileId', {profile.Id},
                        'profileName', {profile.Name},
                        'normalization', 'within-run-percentile-rank',
                        'weights', jsonb_build_object(
                            'transformer', {profile.TransformerWeight},
                            'majorRoad', {profile.MajorRoadWeight},
                            'poi500Meters', {profile.PoiWeight},
                            'populationDensity', {profile.PopulationWeight},
                            'stationGap', {profile.StationGapWeight},
                            'slope', {profile.SlopeWeight}),
                        'recommendationPercentile', {profile.RecommendationPercentile},
                        'recommendationsAreProvisional', NOT {datasetCoverageVerified},
                        'costExcluded', TRUE,
                        'calculatedAtUtc', {calculatedAtUtc}))
                WHERE run.id = {analysisRunId};
                """;

            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                scoringSql,
                cancellationToken);

            var statistics = await _dbContext.SuitabilityCells
                .AsNoTracking()
                .Where(cell => cell.AnalysisRunId == analysisRunId)
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    ScoredCellCount = group.Count(cell => cell.SuitabilityScore.HasValue),
                    MinimumScore = group.Min(cell => cell.SuitabilityScore)!.Value,
                    AverageScore = group.Average(cell => cell.SuitabilityScore)!.Value,
                    MaximumScore = group.Max(cell => cell.SuitabilityScore)!.Value
                })
                .SingleAsync(cancellationToken);

            var provisionalRecommendedCellCount = await _dbContext.Database
                .SqlQuery<int>($"""
                    SELECT COUNT(*)::integer AS "Value"
                    FROM analysis.suitability_cells cell
                    WHERE cell.analysis_run_id = {analysisRunId}
                      AND (cell.metric_details -> 'scoring' ->> 'provisionalRecommendation')::boolean
                    """)
                .SingleAsync(cancellationToken);

            if (statistics.ScoredCellCount != analysisRun.CellCount)
            {
                throw new InvalidOperationException(
                    "Puanlanan hücre sayısı analiz çalışmasının hücre sayısıyla uyuşmuyor.");
            }

            analysisRun.Status = AnalysisRunStatuses.Scored;
            analysisRun.CandidateCellCount = datasetCoverageVerified
                ? provisionalRecommendedCellCount
                : 0;
            analysisRun.CompletedAtUtc = calculatedAtUtc;
            analysisRun.ErrorMessage = null;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new SuitabilityScoringResult(
                analysisRun.Id,
                analysisRun.Status,
                profile.Id,
                profile.Name,
                profile.Version,
                statistics.ScoredCellCount,
                provisionalRecommendedCellCount,
                statistics.MinimumScore,
                Math.Round(statistics.AverageScore, 2),
                statistics.MaximumScore,
                datasetCoverageVerified,
                calculatedAtUtc);
        }
        catch (OperationCanceledException)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            analysisRun.Status = originalStatus;
            analysisRun.ErrorMessage = "Puanlama işlemi iptal edildi.";
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

    private async Task<ScoringProfile> GetOrCreateActiveScoringProfileAsync(
        CancellationToken cancellationToken)
    {
        var profile = await _dbContext.ScoringProfiles
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (profile is not null)
        {
            return profile;
        }

        profile = new ScoringProfile
        {
            Name = SuitabilityScoringDefaults.ProfileName,
            Version = SuitabilityScoringDefaults.ProfileVersion,
            TransformerWeight = SuitabilityScoringDefaults.TransformerWeight,
            MajorRoadWeight = SuitabilityScoringDefaults.MajorRoadWeight,
            PoiWeight = SuitabilityScoringDefaults.PoiWeight,
            PopulationWeight = SuitabilityScoringDefaults.PopulationWeight,
            StationGapWeight = SuitabilityScoringDefaults.StationGapWeight,
            SlopeWeight = SuitabilityScoringDefaults.SlopeWeight,
            RecommendationPercentile = SuitabilityScoringDefaults.RecommendationPercentile,
            IsActive = true
        };

        _dbContext.ScoringProfiles.Add(profile);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return profile;
    }
}
