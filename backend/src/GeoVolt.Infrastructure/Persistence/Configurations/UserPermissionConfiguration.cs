using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class UserPermissionConfiguration : IEntityTypeConfiguration<UserPermission>
{
    public void Configure(EntityTypeBuilder<UserPermission> builder)
    {
        builder.ToTable("user_permissions");

        builder.HasKey(userPermission => new { userPermission.UserId, userPermission.PermissionId });

        builder.Property(userPermission => userPermission.UserId)
            .HasColumnName("user_id");

        builder.Property(userPermission => userPermission.PermissionId)
            .HasColumnName("permission_id");

        builder.Property(userPermission => userPermission.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasOne(userPermission => userPermission.User)
            .WithMany(user => user.UserPermissions)
            .HasForeignKey(userPermission => userPermission.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(userPermission => userPermission.Permission)
            .WithMany(permission => permission.UserPermissions)
            .HasForeignKey(userPermission => userPermission.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
