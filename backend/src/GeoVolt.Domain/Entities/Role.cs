namespace GeoVolt.Domain.Entities;

public sealed class Role
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsSystem { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }
}
