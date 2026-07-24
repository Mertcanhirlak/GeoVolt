using GeoVolt.Domain.Entities;
using GeoVolt.Domain.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class CandidatePointConfiguration : IEntityTypeConfiguration<CandidatePoint>
{
    public void Configure(EntityTypeBuilder<CandidatePoint> builder)
    {
        builder.ToTable("candidate_points", "analysis");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(250).IsRequired();
        builder.Property(x => x.EstimatedAddress).HasMaxLength(500);
        builder.Property(x => x.Region).HasMaxLength(150);
        builder.Property(x => x.Neighborhood).HasMaxLength(150);
        builder.Property(x => x.EstimatedCost).HasPrecision(18, 2);
        builder.Property(x => x.Location).HasColumnType("geometry (Point, 4326)");
        builder.Property(x => x.AlgorithmVersion).HasMaxLength(50).IsRequired();
        builder.Property(x => x.SystemType).HasMaxLength(100);
        builder.Property(x => x.PlaceType).HasMaxLength(100);
        builder.Property(x => x.Status).HasMaxLength(50);
        builder.Property(x => x.SourceType)
            .HasColumnName("source_type")
            .HasMaxLength(30)
            .HasDefaultValue(CandidatePointSourceTypes.AdminManual)
            .IsRequired();
        builder.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id");
        builder.Property(x => x.SourceAnalysisRunId).HasColumnName("source_analysis_run_id");
        builder.Property(x => x.SourceSuitabilityCellId).HasColumnName("source_suitability_cell_id");
        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");
        builder.Ignore(x => x.Latitude);
        builder.Ignore(x => x.Longitude);
        builder.HasIndex(x => x.Location).HasMethod("gist");
        builder.HasIndex(x => new { x.Status, x.GeneralScore });
        builder.HasIndex(x => new { x.RegionId, x.NeighborhoodId });
        builder.HasIndex(x => x.AlgorithmVersion);
        builder.HasIndex(x => new { x.SourceType, x.CreatedAtUtc });
        builder.HasIndex(x => x.SourceSuitabilityCellId)
            .IsUnique()
            .HasFilter("source_suitability_cell_id IS NOT NULL");
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.HasOne<SuitabilityAnalysisRun>()
            .WithMany()
            .HasForeignKey(x => x.SourceAnalysisRunId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.HasOne<SuitabilityCell>()
            .WithMany()
            .HasForeignKey(x => x.SourceSuitabilityCellId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
