using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence.Configurations;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.Persistence;

public sealed class GeoVoltDbContext : DbContext
{
    public GeoVoltDbContext(DbContextOptions<GeoVoltDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Company> Companies => Set<Company>();

    public DbSet<SavedCandidatePoint> SavedCandidatePoints => Set<SavedCandidatePoint>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<Permission> Permissions => Set<Permission>();

    public DbSet<UserRole> UserRoles => Set<UserRole>();

    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new CompanyConfiguration());
        modelBuilder.ApplyConfiguration(new PermissionConfiguration());
        modelBuilder.ApplyConfiguration(new RoleConfiguration());
        modelBuilder.ApplyConfiguration(new RolePermissionConfiguration());
        modelBuilder.ApplyConfiguration(new SavedCandidatePointConfiguration());
        modelBuilder.ApplyConfiguration(new UserConfiguration());
        modelBuilder.ApplyConfiguration(new UserPermissionConfiguration());
        modelBuilder.ApplyConfiguration(new UserRoleConfiguration());
    }
}
