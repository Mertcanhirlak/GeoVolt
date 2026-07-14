using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class RegionConfiguration : IEntityTypeConfiguration<Region>
{
    public void Configure(EntityTypeBuilder<Region> builder)
    {
        builder.ToTable("regions", "gis");
        builder.HasKey(region => region.Id);
        builder.Property(region => region.Id).HasColumnName("id");
        builder.Property(region => region.SourceId).HasColumnName("source_id");
        builder.Property(region => region.DistrictId).HasColumnName("district_id");
        builder.Property(region => region.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
        builder.Property(region => region.Population).HasColumnName("population");
        builder.Property(region => region.Boundary)
            .HasColumnName("boundary")
            .HasColumnType("geometry (MultiPolygon, 4326)")
            .IsRequired();

        builder.HasIndex(region => region.SourceId).IsUnique();
        builder.HasIndex(region => region.DistrictId);
        builder.HasIndex(region => region.Name);
        builder.HasIndex(region => region.Boundary).HasMethod("gist");

        builder.HasOne(region => region.District)
            .WithMany(district => district.Regions)
            .HasForeignKey(region => region.DistrictId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
