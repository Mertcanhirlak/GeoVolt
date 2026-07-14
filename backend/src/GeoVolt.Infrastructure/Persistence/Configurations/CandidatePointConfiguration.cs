using GeoVolt.Domain.Entities;
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
        builder.Ignore(x => x.Latitude);
        builder.Ignore(x => x.Longitude);
        builder.HasIndex(x => x.Location).HasMethod("gist");
        builder.HasIndex(x => new { x.Status, x.GeneralScore });
        builder.HasIndex(x => new { x.RegionId, x.NeighborhoodId });
        builder.HasIndex(x => x.AlgorithmVersion);
    }
}
