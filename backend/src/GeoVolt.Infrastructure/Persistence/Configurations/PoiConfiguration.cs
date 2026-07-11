using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class PoiConfiguration : IEntityTypeConfiguration<Poi>
{
    public void Configure(EntityTypeBuilder<Poi> builder)
    {
        builder.ToTable("pois", "gis");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SourceId).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(300);
        builder.Property(x => x.Category).HasMaxLength(150).IsRequired();
        builder.Property(x => x.SubCategory).HasMaxLength(150);
        builder.Property(x => x.Phone).HasMaxLength(100);
        builder.Property(x => x.Email).HasMaxLength(250);
        builder.Property(x => x.Website).HasMaxLength(1000);
        builder.Property(x => x.Location).HasColumnType("geometry (Point, 4326)").IsRequired();
        builder.HasIndex(x => x.SourceId).IsUnique();
        builder.HasIndex(x => new { x.Category, x.SubCategory });
        builder.HasIndex(x => x.Location).HasMethod("gist");
    }
}
