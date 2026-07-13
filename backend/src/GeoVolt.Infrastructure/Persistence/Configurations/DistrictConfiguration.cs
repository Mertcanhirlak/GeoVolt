using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class DistrictConfiguration : IEntityTypeConfiguration<District>
{
    public void Configure(EntityTypeBuilder<District> builder)
    {
        builder.ToTable("districts", "gis");
        builder.HasKey(district => district.Id);
        builder.Property(district => district.Id).HasColumnName("id");
        builder.Property(district => district.SourceId).HasColumnName("source_id");
        builder.Property(district => district.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
        builder.Property(district => district.Population).HasColumnName("population");
        builder.Property(district => district.Boundary)
            .HasColumnName("boundary")
            .HasColumnType("geometry (MultiPolygon, 4326)")
            .IsRequired();

        builder.HasIndex(district => district.SourceId).IsUnique();
        builder.HasIndex(district => district.Name);
        builder.HasIndex(district => district.Boundary).HasMethod("gist");
    }
}
