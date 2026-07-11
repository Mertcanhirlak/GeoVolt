using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class ScoringProfileConfiguration : IEntityTypeConfiguration<ScoringProfile>
{
    public void Configure(EntityTypeBuilder<ScoringProfile> builder)
    {
        builder.ToTable("scoring_profiles", "analysis");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Version).HasMaxLength(50).IsRequired();
        builder.Property(x => x.DemandWeight).HasPrecision(5, 4);
        builder.Property(x => x.EnergyWeight).HasPrecision(5, 4);
        builder.Property(x => x.AccessWeight).HasPrecision(5, 4);
        builder.Property(x => x.CompetitionWeight).HasPrecision(5, 4);
        builder.HasIndex(x => new { x.Name, x.Version }).IsUnique();
        builder.HasIndex(x => x.IsActive);
    }
}
