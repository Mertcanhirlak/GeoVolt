import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createAdminCompany,
  createAdminUser,
  deleteAdminCompany,
  deleteAdminUser,
  getAdminCompanies,
  getAdminRoles,
  getAdminUsers,
  updateAdminUserRole
} from "../services/adminService";
import geovoltLogo from "../assets/geovolt-logo-transparent.png";
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

const defaultRoles = ["Admin", "CompanyUser"];
const maxUsersPerCompany = 2;

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default function AdminPanel() {
  const { token, user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: String(company.id), label: company.name })),
    [companies]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );

  const selectedCompanyUsers = useMemo(
    () => users.filter((item) => item.companyId === selectedCompanyId),
    [selectedCompanyId, users]
  );

  const dashboard = useMemo(() => {
    const adminCount = users.filter((item) => item.role === "Admin").length;
    const companyUserCount = users.filter((item) => item.role === "CompanyUser").length;
    const emptyCompanyCount = companies.filter((company) => company.userCount === 0).length;
    const fullCompanyCount = companies.filter((company) => company.userCount >= maxUsersPerCompany).length;
    const totalCapacity = companies.length * maxUsersPerCompany;
    const availableSlots = companies.reduce(
      (total, company) => total + Math.max(maxUsersPerCompany - company.userCount, 0),
      0
    );
    const occupancyRate = totalCapacity === 0
      ? 0
      : Math.round(((totalCapacity - availableSlots) / totalCapacity) * 100);
    const recentCompanies = [...companies]
      .sort((left, right) => new Date(right.createdAtUtc) - new Date(left.createdAtUtc))
      .slice(0, 3);
    const companyHealth = companies
      .map((company) => {
        const remainingSlots = Math.max(maxUsersPerCompany - company.userCount, 0);
        const usageRate = Math.round((company.userCount / maxUsersPerCompany) * 100);
        const status = company.userCount === 0
          ? "Kullanıcı bekliyor"
          : remainingSlots === 0
            ? "Limit dolu"
            : "Aktif";

        return {
          ...company,
          remainingSlots,
          usageRate,
          status
        };
      })
      .sort((left, right) => right.usageRate - left.usageRate);
    const roleDistribution = roles.map((role) => ({
      role,
      count: users.filter((item) => item.role === role).length
    }));

    return {
      adminCount,
      companyUserCount,
      emptyCompanyCount,
      fullCompanyCount,
      availableSlots,
      occupancyRate,
      recentCompanies,
      companyHealth,
      roleDistribution
    };
  }, [companies, roles, users]);

  function focusSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadAdminData() {
    setLoading(true);
    setError("");

    const [companyResult, userResult, roleResult] = await Promise.allSettled([
      getAdminCompanies(token),
      getAdminUsers(token),
      getAdminRoles(token)
    ]);

    if (companyResult.status === "fulfilled") {
      setCompanies(Array.isArray(companyResult.value) ? companyResult.value : []);
    }

    if (userResult.status === "fulfilled") {
      const nextUsers = Array.isArray(userResult.value) ? userResult.value : [];

      setUsers(nextUsers);
      setRoleDrafts(
        nextUsers.reduce((drafts, item) => {
          drafts[item.id] = {
            role: item.role,
            companyId: item.companyId ? String(item.companyId) : ""
          };
          return drafts;
        }, {})
      );
    }

    if (roleResult.status === "fulfilled") {
      const nextRoles = Array.isArray(roleResult.value) && roleResult.value.length > 0
        ? roleResult.value
        : defaultRoles;

      setRoles(nextRoles);
    } else {
      setRoles(defaultRoles);
    }

    const mainErrors = [companyResult, userResult]
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.message)
      .filter(Boolean);

    if (mainErrors.length > 0) {
      setError(mainErrors.join(" "));
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    loadAdminData();
  }, [token]);

  function setNotice(text) {
    setMessage(text);
    setError("");
  }

  function setFailure(text) {
    setError(text);
    setMessage("");
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

  async function handleDeleteCompany(companyId) {
    setSaving(true);

    try {
      await deleteAdminCompany(token, companyId);
      if (selectedCompanyId === companyId) {
        setSelectedCompanyId(null);
      }
      setNotice("Firma silindi.");
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

  function updateRoleDraft(userId, field, value) {
    setRoleDrafts((current) => {
      const previous = current[userId] ?? { role: "CompanyUser", companyId: "" };
      const next = { ...previous, [field]: value };

      if (field === "role" && value === "Admin") {
        next.companyId = "";
      }

      return {
        ...current,
        [userId]: next
      };
    });
  }

  async function handleRoleSave(userId) {
    const draft = roleDrafts[userId];

    if (!draft) return;

    setSaving(true);

    try {
      await updateAdminUserRole(token, userId, {
        role: draft.role,
        companyId: draft.role === "Admin" ? null : Number(draft.companyId)
      });
      setNotice("Rol güncellendi.");
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

  function getCompanyUsage(company) {
    const remainingSlots = Math.max(maxUsersPerCompany - company.userCount, 0);
    const usageRate = Math.round((company.userCount / maxUsersPerCompany) * 100);
    const status = company.userCount === 0
      ? "Kullanıcı bekliyor"
      : remainingSlots === 0
        ? "Limit dolu"
        : "Aktif";

    return {
      remainingSlots,
      usageRate,
      status
    };
  }

  const selectedCompanyUsage = selectedCompany ? getCompanyUsage(selectedCompany) : null;

  return (
    <main className="admin-page">
      <div className="admin-top-logo" aria-label="GeoVolt">
        <img src={geovoltLogo} alt="GeoVolt" />
      </div>

      <header className="admin-shell-header">
        <div>
          <p className="admin-kicker">GeoVolt Admin</p>
          <h1>Yönetim Paneli</h1>
        </div>
        <div className="admin-session">
          <span>{user?.fullName ?? user?.email}</span>
          <button type="button" className="admin-secondary-button" onClick={() => navigate("/dashboard")}>
            Harita
          </button>
          <button type="button" className="admin-danger-button" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
      </header>

      {(message || error) && (
        <div className={error ? "admin-alert admin-alert-error" : "admin-alert"}>
          {error || message}
        </div>
      )}

      <section className="admin-hero">
        <div>
          <p className="admin-kicker">Canlı Operasyon</p>
          <h2>Sistem durumunu tek bakışta yönetin</h2>
          <p>
            Firma kapasitesi, rol dağılımı ve kullanıcı limitleri admin kararları için birlikte izlenir.
          </p>
        </div>
        <div className="admin-occupancy-card">
          <span>Firma kapasite doluluğu</span>
          <strong>{dashboard.occupancyRate}%</strong>
          <div className="admin-progress" aria-label="Firma kapasite doluluğu">
            <span style={{ width: `${dashboard.occupancyRate}%` }} />
          </div>
          <small>{dashboard.availableSlots} kullanıcı slotu boşta</small>
        </div>
      </section>

      <section className="admin-summary-grid">
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
          <span>Admin Sayısı</span>
          <strong>{dashboard.adminCount}</strong>
          <small>Yetkili hesaplar</small>
        </div>
        <div className="admin-summary-item">
          <span>Limit Dolan Firma</span>
          <strong>{dashboard.fullCompanyCount}</strong>
          <small>2/2 kullanıcıya ulaşanlar</small>
        </div>
        <div className="admin-summary-item">
          <span>Boş Slot</span>
          <strong>{dashboard.availableSlots}</strong>
          <small>Yeni kullanıcı alanı</small>
        </div>
        <div className="admin-summary-item">
          <span>Rol Tipi</span>
          <strong>{roles.length}</strong>
          <small>{roles.join(" / ")}</small>
        </div>
      </section>

      <section className="admin-dashboard-grid">
        <div className="admin-panel admin-insight-panel">
          <div className="admin-panel-heading">
            <h2>Firma Kapasite Durumu</h2>
            <button type="button" className="admin-secondary-button" onClick={() => focusSection("company-form")}>
              Firma Ekle
            </button>
          </div>
          <div className="admin-capacity-list">
            {dashboard.companyHealth.slice(0, 5).map((company) => (
              <div className="admin-capacity-row" key={company.id}>
                <div>
                  <strong>{company.name}</strong>
                  <span>{company.status}</span>
                </div>
                <div className="admin-capacity-meter">
                  <span>{company.userCount}/{maxUsersPerCompany}</span>
                  <div className="admin-progress">
                    <span style={{ width: `${company.usageRate}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {!loading && dashboard.companyHealth.length === 0 && (
              <p className="admin-muted-text">Henüz firma yok.</p>
            )}
          </div>
        </div>

        <div className="admin-panel admin-insight-panel">
          <div className="admin-panel-heading">
            <h2>Rol Dağılımı</h2>
            <button type="button" className="admin-secondary-button" onClick={() => focusSection("user-management")}>
              Rolleri Yönet
            </button>
          </div>
          <div className="admin-role-bars">
            {dashboard.roleDistribution.map((item) => {
              const rate = users.length === 0 ? 0 : Math.round((item.count / users.length) * 100);

              return (
                <div className="admin-role-bar" key={item.role}>
                  <div>
                    <strong>{item.role}</strong>
                    <span>{item.count} kullanıcı</span>
                  </div>
                  <div className="admin-progress">
                    <span style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="admin-warning-list">
            {dashboard.emptyCompanyCount > 0 && (
              <span>{dashboard.emptyCompanyCount} firma henüz kullanıcıya sahip değil.</span>
            )}
            {dashboard.fullCompanyCount > 0 && (
              <span>{dashboard.fullCompanyCount} firma kullanıcı limitini doldurdu.</span>
            )}
            {dashboard.adminCount <= 1 && (
              <span>Sistemde tek admin var; yedek admin oluşturmak iyi olur.</span>
            )}
          </div>
        </div>

        <div className="admin-panel admin-insight-panel">
          <div className="admin-panel-heading">
            <h2>Son Eklenen Firmalar</h2>
            <button type="button" className="admin-secondary-button" onClick={loadAdminData} disabled={loading}>
              Yenile
            </button>
          </div>
          <div className="admin-recent-list">
            {dashboard.recentCompanies.map((company) => (
              <div className="admin-recent-item" key={company.id}>
                <div>
                  <strong>{company.name}</strong>
                  <span>{company.contactEmail ?? "İletişim e-postası yok"}</span>
                </div>
                <time>{formatDate(company.createdAtUtc)}</time>
              </div>
            ))}
            {!loading && dashboard.recentCompanies.length === 0 && (
              <p className="admin-muted-text">Henüz firma eklenmedi.</p>
            )}
          </div>
        </div>
      </section>

      <section className="admin-layout">
        <div className="admin-panel" id="company-form">
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

        <div className="admin-panel" id="user-form">
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
      </section>

      <section className="admin-panel admin-wide-panel" id="company-list">
        <div className="admin-panel-heading">
          <h2>Firma Listesi</h2>
          <button type="button" className="admin-secondary-button" onClick={loadAdminData} disabled={loading}>
            Yenile
          </button>
        </div>
        <div className="admin-company-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>Vergi no</th>
                  <th>E-posta</th>
                  <th>Kullanıcı</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className={selectedCompanyId === company.id ? "admin-company-row is-selected" : "admin-company-row"}
                    tabIndex={0}
                    onClick={() => setSelectedCompanyId(company.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedCompanyId(company.id);
                      }
                    }}
                  >
                    <td>{company.name}</td>
                    <td>{company.taxNumber ?? "-"}</td>
                    <td>{company.contactEmail ?? "-"}</td>
                    <td>{company.userCount}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteCompany(company.id);
                        }}
                        disabled={saving || company.userCount > 0}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && companies.length === 0 && (
                  <tr>
                    <td colSpan="5" className="admin-empty-cell">
                      Kayıtlı firma yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <aside className="admin-company-detail" aria-live="polite">
            {selectedCompany && selectedCompanyUsage ? (
              <>
                <div className="admin-detail-header">
                  <div>
                    <span>Firma Detayı</span>
                    <h3>{selectedCompany.name}</h3>
                  </div>
                  <div className="admin-detail-actions">
                    <strong>{selectedCompanyUsage.status}</strong>
                    <button
                      type="button"
                      className="admin-close-button"
                      aria-label="Firma detay panelini kapat"
                      onClick={() => setSelectedCompanyId(null)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="admin-detail-grid">
                  <div>
                    <span>Firma ID</span>
                    <strong>#{selectedCompany.id}</strong>
                  </div>
                  <div>
                    <span>Kullanıcı</span>
                    <strong>{selectedCompany.userCount}/{maxUsersPerCompany}</strong>
                  </div>
                  <div>
                    <span>Boş Slot</span>
                    <strong>{selectedCompanyUsage.remainingSlots}</strong>
                  </div>
                  <div>
                    <span>Oluşturulma</span>
                    <strong>{formatDate(selectedCompany.createdAtUtc)}</strong>
                  </div>
                </div>

                <div className="admin-detail-block">
                  <span>Vergi numarası</span>
                  <strong>{selectedCompany.taxNumber ?? "Girilmeyen bilgi"}</strong>
                </div>
                <div className="admin-detail-block">
                  <span>İletişim e-postası</span>
                  <strong>{selectedCompany.contactEmail ?? "Girilmeyen bilgi"}</strong>
                </div>

                <div className="admin-detail-capacity">
                  <div>
                    <span>Kapasite kullanımı</span>
                    <strong>{selectedCompanyUsage.usageRate}%</strong>
                  </div>
                  <div className="admin-progress">
                    <span style={{ width: `${selectedCompanyUsage.usageRate}%` }} />
                  </div>
                </div>

                <div className="admin-detail-users">
                  <div className="admin-detail-users-heading">
                    <span>Firmaya bağlı kullanıcılar</span>
                    <strong>{selectedCompanyUsers.length}</strong>
                  </div>
                  {selectedCompanyUsers.length > 0 ? (
                    selectedCompanyUsers.map((item) => (
                      <div className="admin-detail-user" key={item.id}>
                        <div>
                          <strong>{item.fullName}</strong>
                          <span>{item.email}</span>
                        </div>
                        <em>{item.role}</em>
                      </div>
                    ))
                  ) : (
                    <p className="admin-muted-text">Bu firmaya bağlı kullanıcı yok.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="admin-detail-empty">
                <span>Firma bilgileri</span>
                <h3>Detay görmek için listeden bir firma seçin</h3>
                <p>Seçimden sonra firma kimliği, iletişim bilgileri, kapasite durumu ve bağlı kullanıcılar burada görünür.</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="admin-panel admin-wide-panel" id="user-management">
        <div className="admin-panel-heading">
          <h2>Kullanıcı ve Rol Yönetimi</h2>
        </div>
        <div className="admin-role-strip">
          {roles.map((role) => (
            <span key={role}>{role}</span>
          ))}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>E-posta</th>
                <th>Mevcut rol</th>
                <th>Yeni rol</th>
                <th>Firma</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => {
                const draft = roleDrafts[item.id] ?? {
                  role: item.role,
                  companyId: item.companyId ? String(item.companyId) : ""
                };
                const companyRequired = draft.role === "CompanyUser";

                return (
                  <tr key={item.id}>
                    <td>{item.fullName}</td>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
                    <td>
                      <select
                        value={draft.role}
                        onChange={(event) => updateRoleDraft(item.id, "role", event.target.value)}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={draft.companyId}
                        onChange={(event) => updateRoleDraft(item.id, "companyId", event.target.value)}
                        disabled={!companyRequired}
                        required={companyRequired}
                      >
                        <option value="">Firma seçin</option>
                        {companyOptions.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="admin-action-cell">
                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => handleRoleSave(item.id)}
                        disabled={saving || (companyRequired && !draft.companyId)}
                      >
                        Kaydet
                      </button>
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
                );
              })}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan="6" className="admin-empty-cell">
                    Kayıtlı kullanıcı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
