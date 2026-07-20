using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class SlopeCostBandConfiguration : IEntityTypeConfiguration<SlopeCostBand>
{
    public void Configure(EntityTypeBuilder<SlopeCostBand> builder)
    {
        builder.ToTable("slope_cost_bands", "costing", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("ck_slope_cost_bands_minimum", "min_slope_percent >= 0");
            tableBuilder.HasCheckConstraint("ck_slope_cost_bands_maximum", "max_slope_percent IS NULL OR max_slope_percent > min_slope_percent");
            tableBuilder.HasCheckConstraint("ck_slope_cost_bands_extra_rate", "extra_rate >= 0 AND extra_rate <= 1");
        });

        builder.HasKey(band => band.Id);
        builder.Property(band => band.Id).HasColumnName("id");
        builder.Property(band => band.MinSlopePercent).HasColumnName("min_slope_percent").HasPrecision(6, 2);
        builder.Property(band => band.MaxSlopePercent).HasColumnName("max_slope_percent").HasPrecision(6, 2);
        builder.Property(band => band.ExtraRate).HasColumnName("extra_rate").HasPrecision(8, 4);
        builder.HasIndex(band => band.MinSlopePercent)
            .IsUnique()
            .HasDatabaseName("uq_slope_cost_bands_minimum");

        builder.HasData(
            new SlopeCostBand { Id = 1, MinSlopePercent = 0.00m, MaxSlopePercent = 3.00m, ExtraRate = 0.0000m },
            new SlopeCostBand { Id = 2, MinSlopePercent = 3.00m, MaxSlopePercent = 6.00m, ExtraRate = 0.0500m },
            new SlopeCostBand { Id = 3, MinSlopePercent = 6.00m, MaxSlopePercent = 10.00m, ExtraRate = 0.1200m },
            new SlopeCostBand { Id = 4, MinSlopePercent = 10.00m, MaxSlopePercent = 15.00m, ExtraRate = 0.2500m },
            new SlopeCostBand { Id = 5, MinSlopePercent = 15.00m, MaxSlopePercent = null, ExtraRate = 0.4000m });
    }
}
