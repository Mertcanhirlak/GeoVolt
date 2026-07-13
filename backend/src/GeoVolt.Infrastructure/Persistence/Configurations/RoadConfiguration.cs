using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class RoadConfiguration : IEntityTypeConfiguration<Road>
{
    public void Configure(EntityTypeBuilder<Road> builder)
    {
        builder.ToTable("roads", "gis");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SourceId).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(300);
        builder.Property(x => x.RoadType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Geometry).HasColumnType("geometry (MultiLineString, 4326)").IsRequired();
        builder.HasIndex(x => x.SourceId).IsUnique();
        builder.HasIndex(x => x.RoadType);
        builder.HasIndex(x => x.Geometry).HasMethod("gist");
    }
}
