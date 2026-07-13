namespace GeoVolt.Domain.Entities;

public sealed class Permission
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();

    public ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
