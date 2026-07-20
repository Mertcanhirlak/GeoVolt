using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class SuitabilityCellConfiguration : IEntityTypeConfiguration<SuitabilityCell>
{
    public void Configure(EntityTypeBuilder<SuitabilityCell> builder)
    {
        builder.ToTable("suitability_cells", "analysis", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_evaluation_status",
                $"evaluation_status IN ('{SiteEvaluationStatuses.OutsideStudyArea}', '{SiteEvaluationStatuses.InsufficientData}', '{SiteEvaluationStatuses.HardExclusion}', '{SiteEvaluationStatuses.LowSuitability}', '{SiteEvaluationStatuses.Candidate}')");
            tableBuilder.HasCheckConstraint("ck_suitability_cells_area", "area_square_meters > 0");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_suitability_score",
                "suitability_score IS NULL OR (suitability_score >= 0 AND suitability_score <= 100)");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_confidence_score",
                "confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_distances",
                "(nearest_transformer_meters IS NULL OR nearest_transformer_meters >= 0) AND (nearest_major_road_meters IS NULL OR nearest_major_road_meters >= 0) AND (nearest_station_meters IS NULL OR nearest_station_meters >= 0)");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_poi_counts",
                "(poi_count_300_meters IS NULL OR poi_count_300_meters >= 0) AND (poi_count_500_meters IS NULL OR poi_count_500_meters >= 0) AND (poi_count_1000_meters IS NULL OR poi_count_1000_meters >= 0)");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_population_density",
                "population_density_per_square_kilometer IS NULL OR population_density_per_square_kilometer >= 0");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_slope",
                "slope_percent IS NULL OR slope_percent >= 0");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_estimated_cost",
                "estimated_cost IS NULL OR estimated_cost >= 0");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_boundary_valid",
                "NOT ST_IsEmpty(boundary) AND ST_IsValid(boundary)");
            tableBuilder.HasCheckConstraint(
                "ck_suitability_cells_representative_point",
                "ST_Covers(boundary, representative_point)");
        });

        builder.HasKey(cell => cell.Id);
        builder.Property(cell => cell.Id).HasColumnName("id");
        builder.Property(cell => cell.AnalysisRunId).HasColumnName("analysis_run_id");
        builder.Property(cell => cell.CellI).HasColumnName("cell_i");
        builder.Property(cell => cell.CellJ).HasColumnName("cell_j");
        builder.Property(cell => cell.Boundary)
            .HasColumnName("boundary")
            .HasColumnType("geometry (MultiPolygon, 4326)")
            .IsRequired();
        builder.Property(cell => cell.RepresentativePoint)
            .HasColumnName("representative_point")
            .HasColumnType("geometry (Point, 4326)")
            .IsRequired();
        builder.Property(cell => cell.AreaSquareMeters).HasColumnName("area_square_meters");
        builder.Property(cell => cell.RegionId).HasColumnName("region_id");
        builder.Property(cell => cell.NeighborhoodId).HasColumnName("neighborhood_id");
        builder.Property(cell => cell.EvaluationStatus)
            .HasColumnName("evaluation_status")
            .HasMaxLength(30)
            .IsRequired();
        builder.Property(cell => cell.HasHardExclusion).HasColumnName("has_hard_exclusion");
        builder.Property(cell => cell.SuitabilityScore)
            .HasColumnName("suitability_score")
            .HasPrecision(5, 2);
        builder.Property(cell => cell.ConfidenceScore)
            .HasColumnName("confidence_score")
            .HasPrecision(5, 2);
        builder.Property(cell => cell.NearestTransformerMeters).HasColumnName("nearest_transformer_meters");
        builder.Property(cell => cell.NearestMajorRoadMeters).HasColumnName("nearest_major_road_meters");
        builder.Property(cell => cell.NearestStationMeters).HasColumnName("nearest_station_meters");
        builder.Property(cell => cell.PoiCount300Meters).HasColumnName("poi_count_300_meters");
        builder.Property(cell => cell.PoiCount500Meters).HasColumnName("poi_count_500_meters");
        builder.Property(cell => cell.PoiCount1000Meters).HasColumnName("poi_count_1000_meters");
        builder.Property(cell => cell.PopulationDensityPerSquareKilometer)
            .HasColumnName("population_density_per_square_kilometer");
        builder.Property(cell => cell.SlopePercent).HasColumnName("slope_percent").HasPrecision(6, 2);
        builder.Property(cell => cell.EstimatedCost).HasColumnName("estimated_cost").HasPrecision(18, 2);
        builder.Property(cell => cell.MetricDetailsJson)
            .HasColumnName("metric_details")
            .HasColumnType("jsonb")
            .HasDefaultValueSql("'{}'::jsonb")
            .IsRequired();
        builder.Property(cell => cell.ReasonCodesJson)
            .HasColumnName("reason_codes")
            .HasColumnType("jsonb")
            .HasDefaultValueSql("'[]'::jsonb")
            .IsRequired();
        builder.Property(cell => cell.CalculatedAtUtc).HasColumnName("calculated_at_utc");

        builder.HasIndex(cell => new { cell.AnalysisRunId, cell.CellI, cell.CellJ })
            .IsUnique()
            .HasDatabaseName("uq_suitability_cells_run_grid");
        builder.HasIndex(cell => cell.Boundary)
            .HasMethod("gist")
            .HasDatabaseName("gist_suitability_cells_boundary");
        builder.HasIndex(cell => cell.RepresentativePoint)
            .HasMethod("gist")
            .HasDatabaseName("gist_suitability_cells_representative_point");
        builder.HasIndex(cell => new { cell.AnalysisRunId, cell.EvaluationStatus, cell.SuitabilityScore })
            .HasDatabaseName("ix_suitability_cells_run_status_score");
        builder.HasIndex(cell => new { cell.AnalysisRunId, cell.RegionId, cell.NeighborhoodId })
            .HasDatabaseName("ix_suitability_cells_run_region_neighborhood");
        builder.HasIndex(cell => cell.RegionId)
            .HasDatabaseName("ix_suitability_cells_region");
        builder.HasIndex(cell => cell.NeighborhoodId)
            .HasDatabaseName("ix_suitability_cells_neighborhood");

        builder.HasOne(cell => cell.AnalysisRun)
            .WithMany(run => run.Cells)
            .HasForeignKey(cell => cell.AnalysisRunId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(cell => cell.Region)
            .WithMany()
            .HasForeignKey(cell => cell.RegionId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(cell => cell.Neighborhood)
            .WithMany()
            .HasForeignKey(cell => cell.NeighborhoodId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
