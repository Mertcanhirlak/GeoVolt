using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class NeighborhoodConfiguration : IEntityTypeConfiguration<Neighborhood>
{
    public void Configure(EntityTypeBuilder<Neighborhood> builder)
    {
        builder.ToTable("neighborhoods", "gis");
        builder.HasKey(neighborhood => neighborhood.Id);
        builder.Property(neighborhood => neighborhood.Id).HasColumnName("id");
        builder.Property(neighborhood => neighborhood.SourceId).HasColumnName("source_id");
        builder.Property(neighborhood => neighborhood.RegionId).HasColumnName("region_id");
        builder.Property(neighborhood => neighborhood.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
        builder.Property(neighborhood => neighborhood.Population).HasColumnName("population");
        builder.Property(neighborhood => neighborhood.Boundary)
            .HasColumnName("boundary")
            .HasColumnType("geometry (MultiPolygon, 4326)")
            .IsRequired();

        builder.HasIndex(neighborhood => neighborhood.SourceId).IsUnique();
        builder.HasIndex(neighborhood => neighborhood.RegionId);
        builder.HasIndex(neighborhood => neighborhood.Name);
        builder.HasIndex(neighborhood => neighborhood.Boundary).HasMethod("gist");

        builder.HasOne(neighborhood => neighborhood.Region)
            .WithMany(region => region.Neighborhoods)
            .HasForeignKey(neighborhood => neighborhood.RegionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
