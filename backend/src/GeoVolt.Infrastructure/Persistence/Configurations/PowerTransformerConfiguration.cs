using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class PowerTransformerConfiguration : IEntityTypeConfiguration<PowerTransformer>
{
    public void Configure(EntityTypeBuilder<PowerTransformer> builder)
    {
        builder.ToTable("power_transformers", "gis");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SourceId).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(300);
        builder.Property(x => x.TransformerType).HasMaxLength(100);
        builder.Property(x => x.Location).HasColumnType("geometry (Point, 4326)").IsRequired();
        builder.HasIndex(x => x.SourceId).IsUnique();
        builder.HasIndex(x => x.TransformerType);
        builder.HasIndex(x => x.Location).HasMethod("gist");
    }
}
