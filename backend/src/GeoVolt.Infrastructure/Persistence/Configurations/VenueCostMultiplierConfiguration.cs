using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class VenueCostMultiplierConfiguration : IEntityTypeConfiguration<VenueCostMultiplier>
{
    public void Configure(EntityTypeBuilder<VenueCostMultiplier> builder)
    {
        builder.ToTable("venue_cost_multipliers", "costing", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("ck_venue_cost_multipliers_name", "length(trim(venue_type)) > 0");
            tableBuilder.HasCheckConstraint("ck_venue_cost_multipliers_multiplier", "multiplier > 0");
        });

        builder.HasKey(multiplier => multiplier.Id);
        builder.Property(multiplier => multiplier.Id).HasColumnName("id");
        builder.Property(multiplier => multiplier.VenueType).HasColumnName("venue_type").HasMaxLength(30).IsRequired();
        builder.Property(multiplier => multiplier.Multiplier).HasColumnName("multiplier").HasPrecision(8, 4);
        builder.HasIndex(multiplier => multiplier.VenueType)
            .IsUnique()
            .HasDatabaseName("uq_venue_cost_multipliers_venue_type");

        builder.HasData(
            new VenueCostMultiplier { Id = 1, VenueType = "Workplace", Multiplier = 1.0000m },
            new VenueCostMultiplier { Id = 2, VenueType = "Mall", Multiplier = 1.0800m },
            new VenueCostMultiplier { Id = 3, VenueType = "Highway", Multiplier = 1.1500m });
    }
}
