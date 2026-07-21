using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class ScoringProfileConfiguration : IEntityTypeConfiguration<ScoringProfile>
{
    public void Configure(EntityTypeBuilder<ScoringProfile> builder)
    {
        builder.ToTable("scoring_profiles", "analysis", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "ck_scoring_profiles_weights",
                "\"TransformerWeight\" >= 0 AND \"MajorRoadWeight\" >= 0 AND " +
                "\"PoiWeight\" >= 0 AND \"PopulationWeight\" >= 0 AND " +
                "\"StationGapWeight\" >= 0 AND \"SlopeWeight\" >= 0 AND " +
                "ABS((\"TransformerWeight\" + \"MajorRoadWeight\" + \"PoiWeight\" + " +
                "\"PopulationWeight\" + \"StationGapWeight\" + \"SlopeWeight\") - 1.0) < 0.0001");
            tableBuilder.HasCheckConstraint(
                "ck_scoring_profiles_recommendation_percentile",
                "\"RecommendationPercentile\" > 0 AND \"RecommendationPercentile\" < 1");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Version).HasMaxLength(50).IsRequired();
        builder.Property(x => x.TransformerWeight).HasPrecision(5, 4);
        builder.Property(x => x.MajorRoadWeight).HasPrecision(5, 4);
        builder.Property(x => x.PoiWeight).HasPrecision(5, 4);
        builder.Property(x => x.PopulationWeight).HasPrecision(5, 4);
        builder.Property(x => x.StationGapWeight).HasPrecision(5, 4);
        builder.Property(x => x.SlopeWeight).HasPrecision(5, 4);
        builder.Property(x => x.RecommendationPercentile).HasPrecision(5, 4);
        builder.HasIndex(x => new { x.Name, x.Version }).IsUnique();
        builder.HasIndex(x => x.IsActive);
    }
}
