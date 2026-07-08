namespace GeoVolt.Domain.Entities;

public sealed class SavedCandidatePoint
{
    public int UserId { get; set; }

    public User User { get; set; } = null!;

    public int CandidatePointId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
