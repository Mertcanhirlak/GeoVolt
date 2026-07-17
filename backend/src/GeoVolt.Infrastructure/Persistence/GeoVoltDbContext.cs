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

    public DbSet<District> Districts => Set<District>();

    public DbSet<Region> Regions => Set<Region>();

    public DbSet<Neighborhood> Neighborhoods => Set<Neighborhood>();

    public DbSet<ChargingStation> ChargingStations => Set<ChargingStation>();

    public DbSet<ChargingConnector> ChargingConnectors => Set<ChargingConnector>();

    public DbSet<Poi> Pois => Set<Poi>();

    public DbSet<PowerTransformer> PowerTransformers => Set<PowerTransformer>();

    public DbSet<Road> Roads => Set<Road>();

    public DbSet<CandidatePoint> CandidatePoints => Set<CandidatePoint>();

    public DbSet<DatasetImport> DatasetImports => Set<DatasetImport>();

    public DbSet<StagedGeoJsonFeature> StagedGeoJsonFeatures => Set<StagedGeoJsonFeature>();

    public DbSet<ScoringProfile> ScoringProfiles => Set<ScoringProfile>();

    public DbSet<CostModelSetting> CostModelSettings => Set<CostModelSetting>();

    public DbSet<CostProfile> CostProfiles => Set<CostProfile>();

    public DbSet<SlopeCostBand> SlopeCostBands => Set<SlopeCostBand>();

    public DbSet<VenueCostMultiplier> VenueCostMultipliers => Set<VenueCostMultiplier>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");

        modelBuilder.ApplyConfiguration(new CandidatePointConfiguration());
        modelBuilder.ApplyConfiguration(new ChargingConnectorConfiguration());
        modelBuilder.ApplyConfiguration(new ChargingStationConfiguration());
        modelBuilder.ApplyConfiguration(new CompanyConfiguration());
        modelBuilder.ApplyConfiguration(new CostModelSettingConfiguration());
        modelBuilder.ApplyConfiguration(new CostProfileConfiguration());
        modelBuilder.ApplyConfiguration(new DatasetImportConfiguration());
        modelBuilder.ApplyConfiguration(new DistrictConfiguration());
        modelBuilder.ApplyConfiguration(new NeighborhoodConfiguration());
        modelBuilder.ApplyConfiguration(new PermissionConfiguration());
        modelBuilder.ApplyConfiguration(new PoiConfiguration());
        modelBuilder.ApplyConfiguration(new PowerTransformerConfiguration());
        modelBuilder.ApplyConfiguration(new RegionConfiguration());
        modelBuilder.ApplyConfiguration(new RoleConfiguration());
        modelBuilder.ApplyConfiguration(new RolePermissionConfiguration());
        modelBuilder.ApplyConfiguration(new RoadConfiguration());
        modelBuilder.ApplyConfiguration(new SavedCandidatePointConfiguration());
        modelBuilder.ApplyConfiguration(new ScoringProfileConfiguration());
        modelBuilder.ApplyConfiguration(new SlopeCostBandConfiguration());
        modelBuilder.ApplyConfiguration(new StagedGeoJsonFeatureConfiguration());
        modelBuilder.ApplyConfiguration(new UserConfiguration());
        modelBuilder.ApplyConfiguration(new UserPermissionConfiguration());
        modelBuilder.ApplyConfiguration(new UserRoleConfiguration());
        modelBuilder.ApplyConfiguration(new VenueCostMultiplierConfiguration());
    }
}
