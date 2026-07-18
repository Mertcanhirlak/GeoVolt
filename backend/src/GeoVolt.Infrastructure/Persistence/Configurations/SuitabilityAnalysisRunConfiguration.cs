using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class SuitabilityAnalysisRunConfiguration : IEntityTypeConfiguration<SuitabilityAnalysisRun>
{
    public void Configure(EntityTypeBuilder<SuitabilityAnalysisRun> builder)
    {
        builder.ToTable("analysis_runs", "analysis", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "ck_analysis_runs_status",
                $"status IN ('{AnalysisRunStatuses.Pending}', '{AnalysisRunStatuses.Running}', '{AnalysisRunStatuses.Completed}', '{AnalysisRunStatuses.Failed}', '{AnalysisRunStatuses.Cancelled}')");
            tableBuilder.HasCheckConstraint("ck_analysis_runs_grid_edge", "grid_edge_meters > 0");
            tableBuilder.HasCheckConstraint("ck_analysis_runs_metric_srid", "metric_srid > 0");
            tableBuilder.HasCheckConstraint("ck_analysis_runs_storage_srid", "storage_srid > 0");
            tableBuilder.HasCheckConstraint("ck_analysis_runs_cell_count", "cell_count >= 0");
            tableBuilder.HasCheckConstraint(
                "ck_analysis_runs_candidate_cell_count",
                "candidate_cell_count >= 0 AND candidate_cell_count <= cell_count");
            tableBuilder.HasCheckConstraint(
                "ck_analysis_runs_time_order",
                "completed_at_utc IS NULL OR started_at_utc IS NULL OR completed_at_utc >= started_at_utc");
        });

        builder.HasKey(run => run.Id);
        builder.Property(run => run.Id).HasColumnName("id");
        builder.Property(run => run.StudyAreaDistrictId).HasColumnName("study_area_district_id");
        builder.Property(run => run.ScoringProfileId).HasColumnName("scoring_profile_id");
        builder.Property(run => run.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
        builder.Property(run => run.AlgorithmVersion)
            .HasColumnName("algorithm_version")
            .HasMaxLength(50)
            .IsRequired();
        builder.Property(run => run.GridEdgeMeters).HasColumnName("grid_edge_meters");
        builder.Property(run => run.MetricSrid).HasColumnName("metric_srid");
        builder.Property(run => run.StorageSrid).HasColumnName("storage_srid");
        builder.Property(run => run.DatasetSnapshotJson)
            .HasColumnName("dataset_snapshot")
            .HasColumnType("jsonb")
            .HasDefaultValueSql("'{}'::jsonb")
            .IsRequired();
        builder.Property(run => run.ParametersJson)
            .HasColumnName("parameters")
            .HasColumnType("jsonb")
            .HasDefaultValueSql("'{}'::jsonb")
            .IsRequired();
        builder.Property(run => run.CellCount).HasColumnName("cell_count");
        builder.Property(run => run.CandidateCellCount).HasColumnName("candidate_cell_count");
        builder.Property(run => run.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");
        builder.Property(run => run.StartedAtUtc).HasColumnName("started_at_utc");
        builder.Property(run => run.CompletedAtUtc).HasColumnName("completed_at_utc");
        builder.Property(run => run.ErrorMessage).HasColumnName("error_message").HasMaxLength(4000);

        builder.HasIndex(run => new { run.Status, run.CreatedAtUtc })
            .HasDatabaseName("ix_analysis_runs_status_created");
        builder.HasIndex(run => new { run.StudyAreaDistrictId, run.CreatedAtUtc })
            .HasDatabaseName("ix_analysis_runs_district_created");
        builder.HasIndex(run => run.ScoringProfileId)
            .HasDatabaseName("ix_analysis_runs_scoring_profile");

        builder.HasOne(run => run.StudyAreaDistrict)
            .WithMany()
            .HasForeignKey(run => run.StudyAreaDistrictId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(run => run.ScoringProfile)
            .WithMany()
            .HasForeignKey(run => run.ScoringProfileId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
