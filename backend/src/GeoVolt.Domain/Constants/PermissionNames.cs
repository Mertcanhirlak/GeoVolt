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
    public const string DataImportValidate = "data.import.validate";
    public const string DataImportExecute = "data.import.execute";

    public static readonly IReadOnlyList<PermissionSeed> All = new[]
    {
        new PermissionSeed(PointCreate, "Nokta ekleme", "Nokta"),
        new PermissionSeed(PointRead, "Nokta listeleme", "Nokta"),
        new PermissionSeed(PointUpdate, "Nokta güncelleme", "Nokta"),
        new PermissionSeed(PointDelete, "Nokta silme", "Nokta"),
        new PermissionSeed(UserCreate, "Kullanıcı ekleme", "Kullanıcı"),
        new PermissionSeed(UserRead, "Kullanıcı listeleme", "Kullanıcı"),
        new PermissionSeed(UserUpdate, "Kullanıcı güncelleme", "Kullanıcı"),
        new PermissionSeed(UserDelete, "Kullanıcı silme", "Kullanıcı"),
        new PermissionSeed(UserRoleAssign, "Kullanıcıya rol atama", "Kullanıcı"),
        new PermissionSeed(RoleCreate, "Rol ekleme", "Rol"),
        new PermissionSeed(RoleRead, "Rol listeleme", "Rol"),
        new PermissionSeed(RoleUpdate, "Rol güncelleme", "Rol"),
        new PermissionSeed(RoleDelete, "Rol silme", "Rol"),
        new PermissionSeed(PermissionAssign, "Yetki atama", "Yetki"),
        new PermissionSeed(DashboardAdminView, "Genel istatistikleri görüntüleme", "Genel"),
        new PermissionSeed(DataImportValidate, "CBS veri dosyalarını doğrulama", "Veri Aktarımı"),
        new PermissionSeed(DataImportExecute, "CBS verisini staging alanına aktarma", "Veri Aktarımı")
    };
}

public sealed record PermissionSeed(string Name, string Description, string Category);
