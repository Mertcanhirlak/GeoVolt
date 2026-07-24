import { useEffect, useState } from "react";
import {
  getAdminCostProfiles,
  updateAdminCostProfile
} from "../services/adminService";
import "./AdminCostManagement.css";

const costFields = [
  { key: "equipmentCost", label: "Birim cihaz maliyeti", suffix: "TL" },
  {
    key: "fixedElectricalInfrastructureCost",
    label: "Sabit elektrik altyapı maliyeti",
    suffix: "TL"
  },
  {
    key: "cableUnitCostPerMeter",
    label: "Metre başına kablo maliyeti",
    suffix: "TL/m"
  },
  { key: "fixedSiteCost", label: "Sabit saha maliyeti", suffix: "TL" },
  {
    key: "trenchRestorationUnitCostPerMeter",
    label: "Metre başına kazı/restorasyon maliyeti",
    suffix: "TL/m"
  }
];

function toDraft(profile) {
  return {
    ...profile,
    equipmentCost: String(profile.equipmentCost ?? ""),
    fixedElectricalInfrastructureCost: String(
      profile.fixedElectricalInfrastructureCost ?? ""
    ),
    cableUnitCostPerMeter: String(profile.cableUnitCostPerMeter ?? ""),
    fixedSiteCost: String(profile.fixedSiteCost ?? ""),
    trenchRestorationUnitCostPerMeter: String(
      profile.trenchRestorationUnitCostPerMeter ?? ""
    ),
    riskRatePercent: String(Number(profile.riskRate ?? 0) * 100)
  };
}

function createUpdatePayload(profile) {
  const payload = {};

  costFields.forEach(({ key }) => {
    const value = Number(profile[key]);

    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Maliyet alanları sıfır veya daha büyük olmalıdır.");
    }

    payload[key] = value;
  });

  const riskRatePercent = Number(profile.riskRatePercent);

  if (
    !Number.isFinite(riskRatePercent) ||
    riskRatePercent < 0 ||
    riskRatePercent > 100
  ) {
    throw new Error("Risk oranı %0 ile %100 arasında olmalıdır.");
  }

  payload.riskRate = riskRatePercent / 100;
  return payload;
}

export default function AdminCostManagement({ token, canUpdate }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfiles();
  }, [token]);

  async function loadProfiles() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const result = await getAdminCostProfiles(token);
      setProfiles((Array.isArray(result) ? result : []).map(toDraft));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(profileId, field, value) {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === profileId
          ? { ...profile, [field]: value }
          : profile
      )
    );
    setMessage("");
    setError("");
  }

  async function saveProfile(profile) {
    setSavingId(profile.id);
    setMessage("");
    setError("");

    try {
      const updated = await updateAdminCostProfile(
        token,
        profile.id,
        createUpdatePayload(profile)
      );
      setProfiles((current) =>
        current.map((item) =>
          item.id === profile.id ? toDraft(updated) : item
        )
      );
      setMessage(
        `${updated.systemType} ${updated.powerKw} kW maliyet profili güncellendi.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="admin-cost-management">
      <div className="admin-cost-heading">
        <div>
          <span>Maliyet Yönetimi</span>
          <h2>AC/DC Maliyet Profilleri</h2>
          <p>
            Sistem ve güç tipine göre kullanılan sabit kurulum maliyetlerini
            yönetin.
          </p>
        </div>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={loadProfiles}
          disabled={loading || savingId !== null}
        >
          Yenile
        </button>
      </div>

      {(message || error) && (
        <div className={error ? "admin-alert admin-alert-error" : "admin-alert"}>
          {error || message}
        </div>
      )}

      <div className="admin-cost-note">
        <strong>Hesaplama etkisi</strong>
        <span>
          Değişiklikler yeni manuel pin ve aday analizlerinde kullanılır.
          Önceden hesaplanmış adaylar otomatik olarak yeniden hesaplanmaz.
        </span>
      </div>

      {loading ? (
        <div className="admin-cost-empty">Maliyet profilleri yükleniyor…</div>
      ) : profiles.length === 0 ? (
        <div className="admin-cost-empty">Maliyet profili bulunamadı.</div>
      ) : (
        <div className="admin-cost-profile-grid">
          {profiles.map((profile) => (
            <article className="admin-cost-profile-card" key={profile.id}>
              <header>
                <div>
                  <span
                    className={`admin-cost-system-badge is-${profile.systemType.toLowerCase()}`}
                  >
                    {profile.systemType}
                  </span>
                  <strong>{profile.powerKw} kW</strong>
                </div>
                <small>Profil #{profile.id}</small>
              </header>

              <div className="admin-cost-fields">
                {costFields.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <div className="admin-cost-input">
                      <input
                        className="admin-cost-currency-input"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={profile[field.key]}
                        onChange={(event) =>
                          updateDraft(
                            profile.id,
                            field.key,
                            event.target.value
                          )
                        }
                        disabled={!canUpdate || savingId === profile.id}
                      />
                      <em>{field.suffix}</em>
                    </div>
                  </label>
                ))}

                <label>
                  <span>Risk oranı</span>
                  <div className="admin-cost-input">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={profile.riskRatePercent}
                      onChange={(event) =>
                        updateDraft(
                          profile.id,
                          "riskRatePercent",
                          event.target.value
                        )
                      }
                      disabled={!canUpdate || savingId === profile.id}
                    />
                    <em>%</em>
                  </div>
                </label>
              </div>

              <footer>
                {!canUpdate && (
                  <small>Bu profil için yalnızca görüntüleme yetkiniz var.</small>
                )}
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => saveProfile(profile)}
                    disabled={savingId !== null}
                  >
                    {savingId === profile.id
                      ? "Kaydediliyor…"
                      : "Profili Kaydet"}
                  </button>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
