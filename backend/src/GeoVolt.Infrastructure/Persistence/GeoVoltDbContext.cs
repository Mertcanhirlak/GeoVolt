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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new CompanyConfiguration());
        modelBuilder.ApplyConfiguration(new SavedCandidatePointConfiguration());
        modelBuilder.ApplyConfiguration(new UserConfiguration());
    }
}
