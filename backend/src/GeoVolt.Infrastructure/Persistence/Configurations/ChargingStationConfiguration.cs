using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class ChargingStationConfiguration : IEntityTypeConfiguration<ChargingStation>
{
    public void Configure(EntityTypeBuilder<ChargingStation> builder)
    {
        builder.ToTable("charging_stations", "gis");
        builder.HasKey(station => station.Id);
        builder.Property(station => station.Id).HasColumnName("id");
        builder.Property(station => station.SourceStationNumber).HasColumnName("source_station_number").HasMaxLength(100).IsRequired();
        builder.Property(station => station.Name).HasColumnName("name").HasMaxLength(240).IsRequired();
        builder.Property(station => station.OperatorName).HasColumnName("operator_name").HasMaxLength(180).IsRequired();
        builder.Property(station => station.BrandName).HasColumnName("brand_name").HasMaxLength(180);
        builder.Property(station => station.RegionId).HasColumnName("region_id");
        builder.Property(station => station.NeighborhoodId).HasColumnName("neighborhood_id");
        builder.Property(station => station.Address).HasColumnName("address").HasMaxLength(500).IsRequired();
        builder.Property(station => station.Location).HasColumnName("location").HasColumnType("geometry (Point, 4326)").IsRequired();
        builder.Property(station => station.IsActive).HasColumnName("is_active");
        builder.Property(station => station.IsGreenStation).HasColumnName("is_green_station");

        builder.HasIndex(station => station.SourceStationNumber).IsUnique();
        builder.HasIndex(station => station.OperatorName);
        builder.HasIndex(station => station.RegionId);
        builder.HasIndex(station => station.NeighborhoodId);
        builder.HasIndex(station => station.Location).HasMethod("gist");

        builder.HasOne(station => station.Region).WithMany().HasForeignKey(station => station.RegionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(station => station.Neighborhood).WithMany(neighborhood => neighborhood.ChargingStations).HasForeignKey(station => station.NeighborhoodId).OnDelete(DeleteBehavior.Restrict);
    }
}
