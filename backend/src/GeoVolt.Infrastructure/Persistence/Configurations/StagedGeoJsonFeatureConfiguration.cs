using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class StagedGeoJsonFeatureConfiguration : IEntityTypeConfiguration<StagedGeoJsonFeature>
{
    public void Configure(EntityTypeBuilder<StagedGeoJsonFeature> builder)
    {
        builder.ToTable("geojson_features", "staging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SourceFeatureId).HasMaxLength(200);
        builder.Property(x => x.GeometryType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.PropertiesJson).HasColumnType("jsonb").IsRequired();
        builder.Property(x => x.GeometryJson).HasColumnType("jsonb").IsRequired();
        builder.HasIndex(x => new { x.DatasetImportId, x.FeatureIndex }).IsUnique();
        builder.HasIndex(x => new { x.DatasetImportId, x.SourceFeatureId });
        builder.HasOne(x => x.DatasetImport)
            .WithMany(x => x.StagedFeatures)
            .HasForeignKey(x => x.DatasetImportId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
