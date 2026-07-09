namespace GeoVolt.Domain.Entities;

public sealed class RolePermission
{
    public int RoleId { get; set; }

    public Role Role { get; set; } = null!;

    public int PermissionId { get; set; }

    public Permission Permission { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
