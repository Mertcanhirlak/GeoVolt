using GeoVolt.Domain.Constants;
using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class DatasetCoverageConfiguration : IEntityTypeConfiguration<DatasetCoverage>
{
    public void Configure(EntityTypeBuilder<DatasetCoverage> builder)
    {
        builder.ToTable("dataset_coverages", "gis", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "ck_dataset_coverages_coverage_status",
                $"coverage_status IN ('{DatasetCoverageStatuses.Unknown}', '{DatasetCoverageStatuses.Declared}', '{DatasetCoverageStatuses.Verified}')");
            tableBuilder.HasCheckConstraint(
                "ck_dataset_coverages_completeness_status",
                $"completeness_status IN ('{DatasetCompletenessStatuses.Unknown}', '{DatasetCompletenessStatuses.Partial}', '{DatasetCompletenessStatuses.Complete}')");
            tableBuilder.HasCheckConstraint(
                "ck_dataset_coverages_quality_score",
                "quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)");
            tableBuilder.HasCheckConstraint(
                "ck_dataset_coverages_geometry_required",
                $"coverage_status = '{DatasetCoverageStatuses.Unknown}' OR coverage_geometry IS NOT NULL");
        });

        builder.HasKey(coverage => coverage.Id);
        builder.Property(coverage => coverage.Id).HasColumnName("id");
        builder.Property(coverage => coverage.DatasetImportId).HasColumnName("dataset_import_id");
        builder.Property(coverage => coverage.CoverageGeometry)
            .HasColumnName("coverage_geometry")
            .HasColumnType("geometry (MultiPolygon, 4326)");
        builder.Property(coverage => coverage.CoverageStatus)
            .HasColumnName("coverage_status")
            .HasMaxLength(20)
            .IsRequired();
        builder.Property(coverage => coverage.CompletenessStatus)
            .HasColumnName("completeness_status")
            .HasMaxLength(20)
            .IsRequired();
        builder.Property(coverage => coverage.QualityScore)
            .HasColumnName("quality_score")
            .HasPrecision(5, 2);
        builder.Property(coverage => coverage.IsAuthoritative).HasColumnName("is_authoritative");
        builder.Property(coverage => coverage.Notes).HasColumnName("notes").HasMaxLength(1000);
        builder.Property(coverage => coverage.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");
        builder.Property(coverage => coverage.UpdatedAtUtc)
            .HasColumnName("updated_at_utc")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasIndex(coverage => coverage.DatasetImportId).IsUnique();
        builder.HasIndex(coverage => coverage.CoverageGeometry).HasMethod("gist");
        builder.HasIndex(coverage => new { coverage.CoverageStatus, coverage.CompletenessStatus });

        builder.HasOne(coverage => coverage.DatasetImport)
            .WithOne(datasetImport => datasetImport.Coverage)
            .HasForeignKey<DatasetCoverage>(coverage => coverage.DatasetImportId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
