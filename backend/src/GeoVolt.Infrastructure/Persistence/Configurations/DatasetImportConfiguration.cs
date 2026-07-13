using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class DatasetImportConfiguration : IEntityTypeConfiguration<DatasetImport>
{
    public void Configure(EntityTypeBuilder<DatasetImport> builder)
    {
        builder.ToTable("dataset_imports", "gis");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.DatasetName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.SourceFile).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Sha256).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(50).IsRequired();
        builder.Property(x => x.ErrorMessage).HasMaxLength(4000);
        builder.HasIndex(x => x.Sha256).IsUnique();
        builder.HasIndex(x => new { x.DatasetName, x.ImportedAtUtc });
    }
}
