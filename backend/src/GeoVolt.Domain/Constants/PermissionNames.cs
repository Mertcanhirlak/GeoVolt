namespace GeoVolt.Domain.Constants;

public static class PermissionNames
{
    public const string PointCreate = "point.create";
    public const string PointRead = "point.read";
    public const string PointUpdate = "point.update";
    public const string PointDelete = "point.delete";
    public const string UserCreate = "user.create";
    public const string UserRead = "user.read";
    public const string UserUpdate = "user.update";
    public const string UserDelete = "user.delete";
    public const string UserRoleAssign = "user.role.assign";
    public const string RoleCreate = "role.create";
    public const string RoleRead = "role.read";
    public const string RoleUpdate = "role.update";
    public const string RoleDelete = "role.delete";
    public const string PermissionAssign = "permission.assign";
    public const string DashboardAdminView = "dashboard.admin.view";

    public static readonly IReadOnlyList<PermissionSeed> All = new[]
    {
        new PermissionSeed(PointCreate, "Point ekleme", "Point"),
        new PermissionSeed(PointRead, "Point listeleme", "Point"),
        new PermissionSeed(PointUpdate, "Point guncelleme", "Point"),
        new PermissionSeed(PointDelete, "Point silme", "Point"),
        new PermissionSeed(UserCreate, "Kullanici ekleme", "Kullanici"),
        new PermissionSeed(UserRead, "Kullanici listeleme", "Kullanici"),
        new PermissionSeed(UserUpdate, "Kullanici guncelleme", "Kullanici"),
        new PermissionSeed(UserDelete, "Kullanici silme", "Kullanici"),
        new PermissionSeed(UserRoleAssign, "Kullanici rol atama", "Kullanici"),
        new PermissionSeed(RoleCreate, "Rol ekleme", "Rol"),
        new PermissionSeed(RoleRead, "Rol listeleme", "Rol"),
        new PermissionSeed(RoleUpdate, "Rol guncelleme", "Rol"),
        new PermissionSeed(RoleDelete, "Rol silme", "Rol"),
        new PermissionSeed(PermissionAssign, "Yetki atama", "Yetki"),
        new PermissionSeed(DashboardAdminView, "Genel istatistikleri goruntuleme", "Dashboard")
    };
}

public sealed record PermissionSeed(string Name, string Description, string Category);
