namespace GeoVolt.Domain.Entities;

public sealed class UserPermission
{
    public int UserId { get; set; }

    public User User { get; set; } = null!;

    public int PermissionId { get; set; }

    public Permission Permission { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
