using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class ChargingConnectorConfiguration : IEntityTypeConfiguration<ChargingConnector>
{
    public void Configure(EntityTypeBuilder<ChargingConnector> builder)
    {
        builder.ToTable("charging_connectors", "gis");
        builder.HasKey(connector => connector.Id);
        builder.Property(connector => connector.Id).HasColumnName("id");
        builder.Property(connector => connector.ChargingStationId).HasColumnName("charging_station_id");
        builder.Property(connector => connector.SourceSocketNumber).HasColumnName("source_socket_number").HasMaxLength(100).IsRequired();
        builder.Property(connector => connector.SocketType).HasColumnName("socket_type").HasMaxLength(80).IsRequired();
        builder.Property(connector => connector.ConnectorType).HasColumnName("connector_type").HasMaxLength(80);
        builder.Property(connector => connector.PowerKw).HasColumnName("power_kw");
        builder.Property(connector => connector.Quantity).HasColumnName("quantity");

        builder.HasIndex(connector => new { connector.ChargingStationId, connector.SourceSocketNumber }).IsUnique();
        builder.HasOne(connector => connector.ChargingStation)
            .WithMany(station => station.Connectors)
            .HasForeignKey(connector => connector.ChargingStationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
