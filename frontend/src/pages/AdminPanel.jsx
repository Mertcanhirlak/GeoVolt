import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  assignAdminRolePermissions,
  assignAdminUserRoles,
  createAdminCompany,
  createAdminRole,
  createAdminUser,
  deleteAdminCompany,
  deleteAdminRole,
  deleteAdminUser,
  getAdminCompanies,
  getAdminPermissions,
  getAdminRoles,
  getAdminUsers,
  updateAdminRole,
  updateAdminUserRole
} from "../services/adminService";
import geovoltLogo from "../assets/geovolt-logo-transparent.png";
import AdminCostManagement from "../components/AdminCostManagement";
import AdminMapOperations from "../components/AdminMapOperations";
import "./AdminPanel.css";

const emptyCompanyForm = {
  name: "",
  taxNumber: "",
  contactEmail: ""
};

const emptyUserForm = {
  fullName: "",
  email: "",
  password: "",
  companyId: ""
};

const emptyRoleForm = {
  name: "",
  description: ""
};

const emptyUserRoleForm = {
  userId: "",
  role: "",
  companyId: ""
};

const maxUsersPerCompany = 2;

const permissionGroups = {
  users: ["user.read", "user.create", "user.update", "user.delete", "user.role.assign"],
  map: [
    "point.read",
    "point.create",
    "point.update",
    "point.delete",
    "data.import.validate",
    "data.import.execute"
  ],
  cost: ["cost.read", "cost.update"],
  roles: ["role.read", "role.create", "role.update", "role.delete", "permission.assign"],
  roleAssignment: ["user.role.assign"],
  status: ["dashboard.admin.view"]
};

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function getRoleLabel(roleName) {
  const labels = {
    Admin: "Yönetici",
    CompanyUser: "Firma Kullanıcısı"
  };

  return labels[roleName] ?? roleName;
}

export default function AdminPanel() {
  const {
    token,
    user,
    permissions,
    hasPermission,
    hasAnyPermission,
    logoutUser
  } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("");
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedRolePermissionIds, setSelectedRolePermissionIds] = useState([]);
  const [roleAssignmentUserId, setRoleAssignmentUserId] = useState("");
  const [roleAssignmentIds, setRoleAssignmentIds] = useState([]);
  const [activeUserAction, setActiveUserAction] = useState("");
  const [activeRoleAction, setActiveRoleAction] = useState("");
  const [userRoleForm, setUserRoleForm] = useState(emptyUserRoleForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const visibleTabs = useMemo(() => {
    const tabs = [];

    if (hasAnyPermission(permissionGroups.status)) {
      tabs.push({ id: "status", label: "Genel Durum" });
    }

    if (hasAnyPermission(permissionGroups.users)) {
      tabs.push({ id: "users", label: "Kullanıcı İşlemleri" });
    }

    if (hasAnyPermission(permissionGroups.map)) {
      tabs.push({ id: "map", label: "Harita İşlemleri" });
    }

    if (hasAnyPermission(permissionGroups.cost)) {
      tabs.push({ id: "cost", label: "Maliyet Yönetimi" });
    }

    if (hasAnyPermission(permissionGroups.roles)) {
      tabs.push({ id: "roles", label: "Rol Yönetimi" });
    }

    if (hasAnyPermission(permissionGroups.roleAssignment)) {
      tabs.push({ id: "roleAssignment", label: "Rol Atama" });
    }

    return tabs;
  }, [hasAnyPermission]);

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: String(role.id), label: getRoleLabel(role.name) })),
    [roles]
  );

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: String(company.id), label: company.name })),
    [companies]
  );

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === String(selectedRoleId)) ?? null,
    [roles, selectedRoleId]
  );

  const dashboard = useMemo(() => {
    const adminCount = users.filter((item) => item.role === "Admin").length;
    const companyUserCount = users.filter((item) => item.role === "CompanyUser").length;
    const totalCapacity = companies.length * maxUsersPerCompany;
    const usedSlots = companies.reduce((total, company) => total + company.userCount, 0);
    const availableSlots = Math.max(totalCapacity - usedSlots, 0);
    const occupancyRate = totalCapacity === 0 ? 0 : Math.round((usedSlots / totalCapacity) * 100);
    const roleDistribution = roles.map((role) => ({
      role: getRoleLabel(role.name),
      count: users.filter((item) => item.role === role.name).length
    }));
    const recentUsers = [...users]
      .sort((left, right) => right.id - left.id)
      .slice(0, 4);

    return {
      adminCount,
      companyUserCount,
      availableSlots,
      occupancyRate,
      fullCompanyCount: companies.filter((company) => company.userCount >= maxUsersPerCompany).length,
      emptyCompanyCount: companies.filter((company) => company.userCount === 0).length,
      roleDistribution,
      recentUsers
    };
  }, [companies, roles, users]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, navigate, token, visibleTabs]);

  useEffect(() => {
    loadAdminData();
  }, [token, permissions]);

  useEffect(() => {
    if (!selectedRole) {
      setSelectedRolePermissionIds([]);
      return;
    }

    setSelectedRolePermissionIds((selectedRole.permissions ?? []).map((permission) => permission.id));
  }, [selectedRole]);

  function setNotice(text) {
    setMessage(text);
    setError("");
  }

  function setFailure(text) {
    setError(text);
    setMessage("");
  }

  async function loadAdminData() {
    if (!token) return;

    setLoading(true);
    setError("");

    const requests = [];

    if (hasAnyPermission(["user.read", "user.create", "user.update", "user.delete", "user.role.assign"])) {
      requests.push(["companies", getAdminCompanies(token)]);
    }

    if (hasAnyPermission(["user.read", "user.create", "user.update", "user.delete", "user.role.assign"])) {
      requests.push(["users", getAdminUsers(token)]);
    }

    if (hasAnyPermission(["role.read", "role.create", "role.update", "role.delete", "permission.assign", "user.role.assign"])) {
      requests.push(["roles", getAdminRoles(token)]);
    }

    if (hasPermission("permission.assign")) {
      requests.push(["permissions", getAdminPermissions(token)]);
    }

    const results = await Promise.allSettled(requests.map(([, promise]) => promise));

    results.forEach((result, index) => {
      const key = requests[index][0];

      if (result.status !== "fulfilled") {
        return;
      }

      if (key === "companies") {
        setCompanies(Array.isArray(result.value) ? result.value : []);
      }

      if (key === "users") {
        setUsers(Array.isArray(result.value) ? result.value : []);
      }

      if (key === "roles") {
        setRoles(Array.isArray(result.value) ? result.value : []);
      }

      if (key === "permissions") {
        setPermissionsCatalog(Array.isArray(result.value) ? result.value : []);
      }
    });

    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.message)
      .filter(Boolean);

    if (errors.length > 0) {
      setFailure(errors.join(" "));
    }

    setLoading(false);
  }

  async function handleCreateCompany(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await createAdminCompany(token, {
        name: companyForm.name,
        taxNumber: companyForm.taxNumber || null,
        contactEmail: companyForm.contactEmail || null
      });
      setCompanyForm(emptyCompanyForm);
      setNotice("Firma oluşturuldu.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await createAdminUser(token, {
        fullName: userForm.fullName,
        email: userForm.email,
        password: userForm.password,
        companyId: Number(userForm.companyId)
      });
      setUserForm(emptyUserForm);
      setNotice("Kullanıcı oluşturuldu.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(userId) {
    setSaving(true);

    try {
      await deleteAdminUser(token, userId);
      setNotice("Kullanıcı silindi.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCompany(companyId) {
    setSaving(true);

    try {
      await deleteAdminCompany(token, companyId);
      setNotice("Firma silindi.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRole(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await createAdminRole(token, {
        name: roleForm.name,
        description: roleForm.description || null
      });
      setRoleForm(emptyRoleForm);
      setNotice("Rol oluşturuldu.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRole(role) {
    setSaving(true);

    try {
      await updateAdminRole(token, role.id, {
        name: role.name,
        description: role.description
      });
      setNotice("Rol güncellendi.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole(roleId) {
    setSaving(true);

    try {
      await deleteAdminRole(token, roleId);
      setNotice("Rol silindi.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRolePermissions() {
    if (!selectedRoleId) return;

    setSaving(true);

    try {
      await assignAdminRolePermissions(token, Number(selectedRoleId), selectedRolePermissionIds);
      setNotice("Rol yetkileri güncellendi.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignUserRoles(event) {
    event.preventDefault();

    if (!roleAssignmentUserId || roleAssignmentIds.length === 0) return;

    setSaving(true);

    try {
      await assignAdminUserRoles(token, Number(roleAssignmentUserId), roleAssignmentIds.map(Number));
      setNotice("Kullanıcı rolleri güncellendi.");
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleRolePermission(permissionId) {
    setSelectedRolePermissionIds((current) => (
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId]
    ));
  }

  function toggleAssignmentRole(roleId) {
    setRoleAssignmentIds((current) => (
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
    ));
  }

  function openUserAction(action) {
    setActiveUserAction(action);
    setMessage("");
    setError("");
  }

  function closeUserAction() {
    setActiveUserAction("");
    setUserRoleForm(emptyUserRoleForm);
  }

  function openRoleAction(action) {
    setActiveRoleAction(action);
    setMessage("");
    setError("");
  }

  function closeRoleAction() {
    setActiveRoleAction("");
    setSelectedRoleId("");
    setMessage("");
    setError("");
  }

  function updateRoleDraft(roleId, field, value) {
    setRoles((currentRoles) => currentRoles.map((role) => (
      role.id === roleId ? { ...role, [field]: value } : role
    )));
  }

  function selectUserForRoleUpdate(userId) {
    const selectedUser = users.find((item) => String(item.id) === String(userId));

    setUserRoleForm({
      userId,
      role: selectedUser?.role ?? "",
      companyId: selectedUser?.companyId ? String(selectedUser.companyId) : ""
    });
  }

  async function handleUpdateUserRole(event) {
    event.preventDefault();

    if (!userRoleForm.userId || !userRoleForm.role) return;

    setSaving(true);

    try {
      await updateAdminUserRole(token, Number(userRoleForm.userId), {
        role: userRoleForm.role,
        companyId: userRoleForm.role === "Admin" ? null : Number(userRoleForm.companyId)
      });
      setNotice("Kullanıcı rolü güncellendi.");
      setUserRoleForm(emptyUserRoleForm);
      await loadAdminData();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logoutUser();
    navigate("/login", { replace: true });
  }

  return (
    <main className="admin-page admin-page-v2">
      <header className="admin-shell-header">
        <div className="admin-title-block">
          <p className="admin-kicker">GeoVolt Yönetim</p>
          <h1>Yönetim Paneli</h1>
        </div>
        <div className="admin-top-logo" aria-label="GeoVolt">
          <img src={geovoltLogo} alt="GeoVolt" />
        </div>
        <div className="admin-session">
          <span>{user?.fullName ?? user?.email}</span>
          <span className="admin-role-pill">{getRoleLabel(user?.role)}</span>
          <button type="button" className="admin-secondary-button" onClick={() => navigate("/dashboard")}>
            Harita
          </button>
          <button type="button" className="admin-danger-button" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
      </header>

      {(message || error) && !activeRoleAction && (
        <div className={error ? "admin-alert admin-alert-error" : "admin-alert"}>
          {error || message}
        </div>
      )}

      <section className="admin-tabs" aria-label="Yönetim sekmeleri">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {activeTab === "status" && (
        <section className="admin-tab-panel">
          <div className="admin-summary-grid">
            <div className="admin-summary-item">
              <span>Toplam Firma</span>
              <strong>{companies.length}</strong>
              <small>{dashboard.emptyCompanyCount} firma kullanıcı bekliyor</small>
            </div>
            <div className="admin-summary-item">
              <span>Toplam Kullanıcı</span>
              <strong>{users.length}</strong>
              <small>{dashboard.companyUserCount} firma kullanıcısı</small>
            </div>
            <div className="admin-summary-item">
              <span>Yönetici Sayısı</span>
              <strong>{dashboard.adminCount}</strong>
              <small>Tam yetkili hesaplar</small>
            </div>
            <div className="admin-summary-item">
              <span>Rol Sayısı</span>
              <strong>{roles.length}</strong>
              <small>Aktif rol kataloğu</small>
            </div>
            <div className="admin-summary-item">
              <span>Yetki Sayısı</span>
              <strong>{permissionsCatalog.length || permissions.length}</strong>
              <small>Yönetilen yetki sayısı</small>
            </div>
            <div className="admin-summary-item">
              <span>Doluluk</span>
              <strong>{dashboard.occupancyRate}%</strong>
              <small>{dashboard.availableSlots} boş kontenjan</small>
            </div>
          </div>
          <div className="admin-status-grid">
            <div className="admin-status-card admin-status-card-main">
              <div className="admin-status-heading">
                <div>
                  <span>Operasyon Doluluğu</span>
                  <strong>{dashboard.occupancyRate}%</strong>
                </div>
                <div className="admin-status-shape admin-status-ring" style={{ "--status-progress": `${dashboard.occupancyRate}%` }}>
                  <span>{dashboard.occupancyRate}</span>
                </div>
              </div>
              <div className="admin-progress admin-status-progress">
                <span style={{ width: `${dashboard.occupancyRate}%` }} />
              </div>
              <p>{dashboard.availableSlots} kullanıcı kontenjanı boş, {dashboard.fullCompanyCount} firma kapasite sınırında.</p>
            </div>

            <div className="admin-status-card">
              <div className="admin-status-heading">
                <div>
                  <span>Rol Dağılımı</span>
                  <strong>{roles.length} rol</strong>
                </div>
                <div className="admin-status-shape admin-status-stack" />
              </div>
              <div className="admin-mini-list">
                {dashboard.roleDistribution.map((item) => (
                  <div className="admin-mini-row" key={item.role}>
                    <span>{item.role}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
                {dashboard.roleDistribution.length === 0 && <p className="admin-muted-text">Rol verisi yok.</p>}
              </div>
            </div>

            <div className="admin-status-card">
              <div className="admin-status-heading">
                <div>
                  <span>Son Kullanıcılar</span>
                  <strong>{dashboard.recentUsers.length}</strong>
                </div>
                <div className="admin-status-shape admin-status-dots" />
              </div>
              <div className="admin-mini-list">
                {dashboard.recentUsers.map((item) => (
                  <div className="admin-mini-row" key={item.id}>
                    <span>{item.fullName}</span>
                    <strong>{getRoleLabel(item.role)}</strong>
                  </div>
                ))}
                {dashboard.recentUsers.length === 0 && <p className="admin-muted-text">Kullanıcı verisi yok.</p>}
              </div>
            </div>

            <div className="admin-status-card">
              <div className="admin-status-heading">
                <div>
                  <span>Sistem Uyarıları</span>
                  <strong>{dashboard.emptyCompanyCount + dashboard.fullCompanyCount + (dashboard.adminCount <= 1 ? 1 : 0)}</strong>
                </div>
                <div className="admin-status-shape admin-status-pulse" />
              </div>
              <div className="admin-mini-list">
                <div className="admin-mini-row">
                  <span>Kullanıcısız firma</span>
                  <strong>{dashboard.emptyCompanyCount}</strong>
                </div>
                <div className="admin-mini-row">
                  <span>Limit dolu firma</span>
                  <strong>{dashboard.fullCompanyCount}</strong>
                </div>
                <div className="admin-mini-row">
                  <span>Yedek yönetici ihtiyacı</span>
                  <strong>{dashboard.adminCount <= 1 ? "Var" : "Yok"}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "users" && (
        <section className="admin-tab-panel">
          <div className="admin-user-action-grid">
            {hasPermission("user.create") && (
              <button type="button" className="admin-user-action-card" onClick={() => openUserAction("create")}>
                <span>01</span>
                <strong>Kullanıcı Ekle</strong>
                <small>Firma seçerek yeni kullanıcı oluştur.</small>
              </button>
            )}

            {hasPermission("user.read") && (
              <button type="button" className="admin-user-action-card" onClick={() => openUserAction("list")}>
                <span>02</span>
                <strong>Kullanıcıları Listele</strong>
                <small>Kayıtlı kullanıcıları, rollerini ve firmalarını gör.</small>
              </button>
            )}

            {hasPermission("user.role.assign") && (
              <button type="button" className="admin-user-action-card" onClick={() => openUserAction("updateRole")}>
                <span>03</span>
                <strong>Rol Güncelle</strong>
                <small>Kullanıcının rolünü ve firma bağlantısını değiştir.</small>
              </button>
            )}

            {hasPermission("user.delete") && (
              <button type="button" className="admin-user-action-card is-danger" onClick={() => openUserAction("delete")}>
                <span>04</span>
                <strong>Kullanıcı Sil</strong>
                <small>Silinebilir kullanıcıları ayrı ekranda yönet.</small>
              </button>
            )}
          </div>

          {activeUserAction && (
            <div className="admin-modal-backdrop" role="presentation">
              <section className="admin-modal" role="dialog" aria-modal="true" aria-label="Kullanıcı işlemi">
                <div className="admin-modal-heading">
                  <div>
                    <span>Kullanıcı İşlemleri</span>
                    <h2>
                      {activeUserAction === "create" && "Kullanıcı Ekle"}
                      {activeUserAction === "list" && "Kullanıcıları Listele"}
                      {activeUserAction === "updateRole" && "Rol Güncelle"}
                      {activeUserAction === "delete" && "Kullanıcı Sil"}
                    </h2>
                  </div>
                  <button type="button" className="admin-close-button" onClick={closeUserAction} aria-label="Kapat">
                    ×
                  </button>
                </div>

                {activeUserAction === "create" && (
                  <div className="admin-modal-grid">
                    <div className="admin-panel">
                      <div className="admin-panel-heading">
                        <h2>Kullanıcı Ekle</h2>
                      </div>
                      <form className="admin-form" onSubmit={handleCreateUser}>
                        <label>
                          Ad soyad
                          <input
                            value={userForm.fullName}
                            onChange={(event) => setUserForm({ ...userForm, fullName: event.target.value })}
                            minLength={2}
                            maxLength={120}
                            required
                          />
                        </label>
                        <label>
                          E-posta
                          <input
                            type="email"
                            value={userForm.email}
                            onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                            maxLength={180}
                            required
                          />
                        </label>
                        <label>
                          Şifre
                          <input
                            type="password"
                            value={userForm.password}
                            onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                            minLength={6}
                            maxLength={100}
                            required
                          />
                        </label>
                        <label>
                          Firma
                          <select
                            value={userForm.companyId}
                            onChange={(event) => setUserForm({ ...userForm, companyId: event.target.value })}
                            required
                          >
                            <option value="">Firma seçin</option>
                            {companyOptions.map((company) => (
                              <option key={company.value} value={company.value}>
                                {company.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" disabled={saving || companies.length === 0}>
                          Kullanıcı Kaydet
                        </button>
                      </form>
                    </div>

                    <div className="admin-panel">
                      <div className="admin-panel-heading">
                        <h2>Firma Ekle</h2>
                      </div>
                      <form className="admin-form" onSubmit={handleCreateCompany}>
                        <label>
                          Firma adı
                          <input
                            value={companyForm.name}
                            onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })}
                            minLength={2}
                            maxLength={160}
                            required
                          />
                        </label>
                        <label>
                          Vergi numarası
                          <input
                            value={companyForm.taxNumber}
                            onChange={(event) => setCompanyForm({ ...companyForm, taxNumber: event.target.value })}
                            maxLength={40}
                          />
                        </label>
                        <label>
                          İletişim e-postası
                          <input
                            type="email"
                            value={companyForm.contactEmail}
                            onChange={(event) => setCompanyForm({ ...companyForm, contactEmail: event.target.value })}
                            maxLength={180}
                          />
                        </label>
                        <button type="submit" disabled={saving}>
                          Firma Kaydet
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {activeUserAction === "list" && (
                  <div className="admin-modal-table">
                    <div className="admin-panel-heading">
                      <h2>Kullanıcı Listesi</h2>
                      <button type="button" className="admin-secondary-button" onClick={loadAdminData} disabled={loading}>
                        Yenile
                      </button>
                    </div>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Kullanıcı</th>
                            <th>E-posta</th>
                            <th>Rol</th>
                            <th>Firma</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((item) => (
                            <tr key={item.id}>
                              <td>{item.fullName}</td>
                              <td>{item.email}</td>
                              <td>{getRoleLabel(item.role)}</td>
                              <td>{item.companyName ?? "-"}</td>
                            </tr>
                          ))}
                          {!loading && users.length === 0 && (
                            <tr>
                              <td colSpan="4" className="admin-empty-cell">
                                Kayıtlı kullanıcı yok.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeUserAction === "updateRole" && (
                  <form className="admin-form admin-modal-form" onSubmit={handleUpdateUserRole}>
                    <label>
                      Kullanıcı
                      <select value={userRoleForm.userId} onChange={(event) => selectUserForRoleUpdate(event.target.value)} required>
                        <option value="">Kullanıcı seçin</option>
                        {users.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.fullName} - {item.email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Rol
                      <select
                        value={userRoleForm.role}
                        onChange={(event) => setUserRoleForm({ ...userRoleForm, role: event.target.value })}
                        required
                      >
                        <option value="">Rol seçin</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.name}>
                            {getRoleLabel(role.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {userRoleForm.role !== "Admin" && (
                      <label>
                        Firma
                        <select
                          value={userRoleForm.companyId}
                          onChange={(event) => setUserRoleForm({ ...userRoleForm, companyId: event.target.value })}
                          required
                        >
                          <option value="">Firma seçin</option>
                          {companyOptions.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      type="submit"
                      disabled={saving || !userRoleForm.userId || !userRoleForm.role || (userRoleForm.role !== "Admin" && !userRoleForm.companyId)}
                    >
                      Rolü Güncelle
                    </button>
                  </form>
                )}

                {activeUserAction === "delete" && (
                  <div className="admin-modal-table">
                    <div className="admin-panel-heading">
                      <h2>Kullanıcı Sil</h2>
                      <button type="button" className="admin-secondary-button" onClick={loadAdminData} disabled={loading}>
                        Yenile
                      </button>
                    </div>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Kullanıcı</th>
                            <th>E-posta</th>
                            <th>Rol</th>
                            <th>Aksiyon</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((item) => (
                            <tr key={item.id}>
                              <td>{item.fullName}</td>
                              <td>{item.email}</td>
                              <td>{getRoleLabel(item.role)}</td>
                              <td className="admin-action-cell">
                                <button
                                  type="button"
                                  className="admin-danger-button"
                                  onClick={() => handleDeleteUser(item.id)}
                                  disabled={saving || item.id === user?.id}
                                >
                                  Sil
                                </button>
                              </td>
                            </tr>
                          ))}
                          {!loading && users.length === 0 && (
                            <tr>
                              <td colSpan="4" className="admin-empty-cell">
                                Kayıtlı kullanıcı yok.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      )}

      {activeTab === "map" && (
        <AdminMapOperations
          token={token}
          hasPermission={hasPermission}
        />
      )}

      {activeTab === "cost" && (
        <section className="admin-tab-panel">
          <div className="admin-panel admin-wide-panel">
            <AdminCostManagement
              token={token}
              canUpdate={hasPermission("cost.update")}
            />
          </div>
        </section>
      )}

      {activeTab === "roles" && (
        <section className="admin-tab-panel">
          <div className="admin-user-action-grid admin-role-action-grid">
            {hasPermission("role.create") && (
              <button type="button" className="admin-user-action-card" onClick={() => openRoleAction("create")}>
                <span>01</span>
                <strong>Rol Ekle</strong>
                <small>Yeni bir rol adı ve açıklaması belirle.</small>
              </button>
            )}

            {hasPermission("role.read") && (
              <button type="button" className="admin-user-action-card" onClick={() => openRoleAction("manage")}>
                <span>02</span>
                <strong>Rolleri Yönet</strong>
                <small>Rolleri görüntüle, düzenle veya sil.</small>
              </button>
            )}

            {hasPermission("permission.assign") && (
              <button type="button" className="admin-user-action-card" onClick={() => openRoleAction("permissions")}>
                <span>03</span>
                <strong>Role Yetki Ver</strong>
                <small>Bir rol seçerek yönetim yetkilerini düzenle.</small>
              </button>
            )}
          </div>

          {activeRoleAction && (
            <div className="admin-modal-backdrop" role="presentation">
              <section className="admin-modal" role="dialog" aria-modal="true" aria-label="Rol işlemi">
                <div className="admin-modal-heading">
                  <div>
                    <span>Rol Yönetimi</span>
                    <h2>
                      {activeRoleAction === "create" && "Rol Ekle"}
                      {activeRoleAction === "manage" && "Rolleri Yönet"}
                      {activeRoleAction === "permissions" && "Role Yetki Ver"}
                    </h2>
                  </div>
                  <button type="button" className="admin-close-button" onClick={closeRoleAction} aria-label="Kapat">
                    ×
                  </button>
                </div>

                {(message || error) && (
                  <div className={error ? "admin-alert admin-alert-error" : "admin-alert"}>
                    {error || message}
                  </div>
                )}

                {activeRoleAction === "create" && (
                  <form className="admin-form admin-modal-form" onSubmit={handleCreateRole}>
                    <label>
                      Rol adı
                      <input
                        value={roleForm.name}
                        onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })}
                        maxLength={80}
                        required
                      />
                    </label>
                    <label>
                      Açıklama
                      <input
                        value={roleForm.description}
                        onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })}
                        maxLength={240}
                      />
                    </label>
                    <button type="submit" disabled={saving}>
                      Rol Kaydet
                    </button>
                  </form>
                )}

                {activeRoleAction === "manage" && (
                  <div className="admin-modal-table">
                    <div className="admin-panel-heading">
                      <h2>Kayıtlı Roller</h2>
                      <button type="button" className="admin-secondary-button" onClick={loadAdminData} disabled={loading}>
                        Yenile
                      </button>
                    </div>
                    <div className="admin-role-card-grid">
                      {roles.map((role) => (
                        <article className="admin-role-card" key={role.id}>
                          <div className="admin-role-fields">
                            <label>
                              Rol adı
                              <input
                                value={role.isSystem ? getRoleLabel(role.name) : role.name}
                                onChange={(event) => updateRoleDraft(role.id, "name", event.target.value)}
                                maxLength={80}
                                disabled={role.isSystem || !hasPermission("role.update")}
                              />
                            </label>
                            <label>
                              Açıklama
                              <input
                                value={role.description ?? ""}
                                onChange={(event) => updateRoleDraft(role.id, "description", event.target.value)}
                                maxLength={240}
                                disabled={role.isSystem || !hasPermission("role.update")}
                              />
                            </label>
                          </div>
                          <small>{role.userCount} kullanıcı · {(role.permissions ?? []).length} yetki</small>
                          <div className="admin-permission-grid">
                            {(role.permissions ?? []).map((permission) => (
                              <span className="admin-permission-chip is-granted" key={permission.id}>
                                {permission.description}
                              </span>
                            ))}
                          </div>
                          <div className="admin-action-cell">
                            {role.isSystem && <small>Sistem rolü</small>}
                            {hasPermission("role.update") && !role.isSystem && (
                              <button type="button" className="admin-secondary-button" onClick={() => handleUpdateRole(role)} disabled={saving || !role.name.trim()}>
                                Kaydet
                              </button>
                            )}
                            {hasPermission("role.delete") && !role.isSystem && (
                              <button type="button" className="admin-danger-button" onClick={() => handleDeleteRole(role.id)} disabled={saving}>
                                Sil
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {activeRoleAction === "permissions" && (
                  <div className="admin-modal-table">
                    <div className="admin-panel-heading">
                      <h2>Rol Yetkileri</h2>
                      <button type="button" className="admin-secondary-button" onClick={handleSaveRolePermissions} disabled={saving || !selectedRoleId}>
                        Yetkileri Kaydet
                      </button>
                    </div>
                    <label className="admin-inline-label">
                      Rol
                      <select value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)}>
                        <option value="">Rol seçin</option>
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="admin-permission-grid">
                      {permissionsCatalog.map((permission) => (
                        <label className="admin-permission-check" key={permission.id}>
                          <input
                            type="checkbox"
                            checked={selectedRolePermissionIds.includes(permission.id)}
                            onChange={() => toggleRolePermission(permission.id)}
                            disabled={!selectedRoleId}
                          />
                          <span>{permission.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      )}

      {activeTab === "roleAssignment" && (
        <section className="admin-tab-panel">
          <div className="admin-panel admin-wide-panel">
            <div className="admin-panel-heading">
              <h2>Kullanıcıya Rol Ata</h2>
            </div>
            <form className="admin-form" onSubmit={handleAssignUserRoles}>
              <label>
                Kullanıcı
                <select
                  value={roleAssignmentUserId}
                  onChange={(event) => {
                    const nextUserId = event.target.value;
                    const selectedUser = users.find((item) => String(item.id) === nextUserId);
                    const selectedRole = roles.find((role) => role.name === selectedUser?.role);

                    setRoleAssignmentUserId(nextUserId);
                    setRoleAssignmentIds(selectedRole ? [selectedRole.id] : []);
                  }}
                  required
                >
                  <option value="">Kullanıcı seçin</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName} - {item.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-role-checkboxes">
                {roles.map((role) => (
                  <label key={role.id} className="admin-permission-check">
                    <input
                      type="checkbox"
                      checked={roleAssignmentIds.includes(role.id)}
                      onChange={() => toggleAssignmentRole(role.id)}
                    />
                    <span>{getRoleLabel(role.name)}</span>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={saving || !roleAssignmentUserId || roleAssignmentIds.length === 0}>
                Rolleri Kaydet
              </button>
            </form>
          </div>
        </section>
      )}

      {visibleTabs.length === 0 && (
        <section className="admin-panel admin-wide-panel">
          <div className="admin-panel-heading">
            <h2>Yetki yok</h2>
          </div>
        </section>
      )}
    </main>
  );
}
