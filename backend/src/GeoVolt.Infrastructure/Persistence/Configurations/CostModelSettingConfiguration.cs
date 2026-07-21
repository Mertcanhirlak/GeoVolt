using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class CostModelSettingConfiguration : IEntityTypeConfiguration<CostModelSetting>
{
    public void Configure(EntityTypeBuilder<CostModelSetting> builder)
    {
        builder.ToTable("cost_model_settings", "costing", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("ck_cost_model_settings_single_row", "id = 1");
            tableBuilder.HasCheckConstraint("ck_cost_model_settings_currency_code", "char_length(currency_code) = 3");
            tableBuilder.HasCheckConstraint("ck_cost_model_settings_route_multiplier", "route_multiplier > 0");
            tableBuilder.HasCheckConstraint("ck_cost_model_settings_rounding_step", "rounding_step > 0");
        });

        builder.HasKey(setting => setting.Id);
        builder.Property(setting => setting.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(setting => setting.Version).HasColumnName("version").HasMaxLength(20).IsRequired();
        builder.Property(setting => setting.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsRequired();
        builder.Property(setting => setting.RouteMultiplier).HasColumnName("route_multiplier").HasPrecision(6, 3);
        builder.Property(setting => setting.RoundingStep).HasColumnName("rounding_step").HasPrecision(18, 2);
        builder.Property(setting => setting.UpdatedAtUtc)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasData(new CostModelSetting
        {
            Id = 1,
            Version = "2026.1",
            CurrencyCode = "TRY",
            RouteMultiplier = 1.150m,
            RoundingStep = 1000.00m,
            UpdatedAtUtc = new DateTime(2026, 7, 17, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
