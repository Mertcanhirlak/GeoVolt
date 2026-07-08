using GeoVolt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GeoVolt.Infrastructure.Persistence.Configurations;

public sealed class SavedCandidatePointConfiguration : IEntityTypeConfiguration<SavedCandidatePoint>
{
    public void Configure(EntityTypeBuilder<SavedCandidatePoint> builder)
    {
        builder.ToTable("saved_candidate_points");

        builder.HasKey(savedCandidatePoint => new
        {
            savedCandidatePoint.UserId,
            savedCandidatePoint.CandidatePointId
        });

        builder.Property(savedCandidatePoint => savedCandidatePoint.UserId)
            .HasColumnName("user_id");

        builder.Property(savedCandidatePoint => savedCandidatePoint.CandidatePointId)
            .HasColumnName("candidate_point_id");

        builder.Property(savedCandidatePoint => savedCandidatePoint.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasOne(savedCandidatePoint => savedCandidatePoint.User)
            .WithMany(user => user.SavedCandidatePoints)
            .HasForeignKey(savedCandidatePoint => savedCandidatePoint.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
