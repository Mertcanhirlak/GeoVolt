using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("permissions");

        builder.HasKey(permission => permission.Id);

        builder.Property(permission => permission.Id)
            .HasColumnName("id");

        builder.Property(permission => permission.Name)
            .HasColumnName("name")
            .HasMaxLength(120)
            .IsRequired();

        builder.HasIndex(permission => permission.Name)
            .IsUnique();

        builder.Property(permission => permission.Description)
            .HasColumnName("description")
            .HasMaxLength(240)
            .IsRequired();

        builder.Property(permission => permission.Category)
            .HasColumnName("category")
            .HasMaxLength(80)
            .IsRequired();

        builder.Property(permission => permission.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();
    }
}
