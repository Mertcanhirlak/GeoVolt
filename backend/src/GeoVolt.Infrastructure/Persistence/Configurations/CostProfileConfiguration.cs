using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class CostProfileConfiguration : IEntityTypeConfiguration<CostProfile>
{
    public void Configure(EntityTypeBuilder<CostProfile> builder)
    {
        builder.ToTable("cost_profiles", "costing", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("ck_cost_profiles_system_type", "system_type IN ('AC', 'DC')");
            tableBuilder.HasCheckConstraint("ck_cost_profiles_power_kw", "power_kw > 0");
            tableBuilder.HasCheckConstraint("ck_cost_profiles_equipment_cost", "equipment_cost >= 0");
            tableBuilder.HasCheckConstraint("ck_cost_profiles_fixed_electrical_cost", "fixed_electrical_infrastructure_cost >= 0");
            tableBuilder.HasCheckConstraint("ck_cost_profiles_cable_cost", "cable_unit_cost_per_meter >= 0");
            tableBuilder.HasCheckConstraint("ck_cost_profiles_fixed_site_cost", "fixed_site_cost >= 0");
            tableBuilder.HasCheckConstraint("ck_cost_profiles_trench_cost", "trench_restoration_unit_cost_per_meter >= 0");
            tableBuilder.HasCheckConstraint("ck_cost_profiles_risk_rate", "risk_rate >= 0 AND risk_rate <= 1");
        });

        builder.HasKey(profile => profile.Id);
        builder.Property(profile => profile.Id).HasColumnName("id");
        builder.Property(profile => profile.SystemType).HasColumnName("system_type").HasMaxLength(2).IsRequired();
        builder.Property(profile => profile.PowerKw).HasColumnName("power_kw");
        builder.Property(profile => profile.EquipmentCost).HasColumnName("equipment_cost").HasPrecision(18, 2);
        builder.Property(profile => profile.FixedElectricalInfrastructureCost).HasColumnName("fixed_electrical_infrastructure_cost").HasPrecision(18, 2);
        builder.Property(profile => profile.CableUnitCostPerMeter).HasColumnName("cable_unit_cost_per_meter").HasPrecision(18, 2);
        builder.Property(profile => profile.FixedSiteCost).HasColumnName("fixed_site_cost").HasPrecision(18, 2);
        builder.Property(profile => profile.TrenchRestorationUnitCostPerMeter).HasColumnName("trench_restoration_unit_cost_per_meter").HasPrecision(18, 2);
        builder.Property(profile => profile.RiskRate).HasColumnName("risk_rate").HasPrecision(8, 4);
        builder.HasIndex(profile => new { profile.SystemType, profile.PowerKw })
            .IsUnique()
            .HasDatabaseName("uq_cost_profiles_system_type_power_kw");

        builder.HasData(
            new CostProfile
            {
                Id = 1,
                SystemType = "AC",
                PowerKw = 22,
                EquipmentCost = 44300.00m,
                FixedElectricalInfrastructureCost = 50000.00m,
                CableUnitCostPerMeter = 761.00m,
                FixedSiteCost = 25000.00m,
                TrenchRestorationUnitCostPerMeter = 1500.00m,
                RiskRate = 0.1000m
            },
            new CostProfile
            {
                Id = 2,
                SystemType = "DC",
                PowerKw = 60,
                EquipmentCost = 700000.00m,
                FixedElectricalInfrastructureCost = 200000.00m,
                CableUnitCostPerMeter = 3181.00m,
                FixedSiteCost = 40000.00m,
                TrenchRestorationUnitCostPerMeter = 1700.00m,
                RiskRate = 0.1500m
            },
            new CostProfile
            {
                Id = 3,
                SystemType = "DC",
                PowerKw = 120,
                EquipmentCost = 1200000.00m,
                FixedElectricalInfrastructureCost = 350000.00m,
                CableUnitCostPerMeter = 5353.00m,
                FixedSiteCost = 50000.00m,
                TrenchRestorationUnitCostPerMeter = 1700.00m,
                RiskRate = 0.1500m
            });
    }
}
