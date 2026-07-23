import { useCallback, useEffect, useState } from "react";
import {
  createAdminCandidatePoint,
  calculateAdminSuitabilityMetrics,
  calculateAdminSuitabilityScores,
  deleteAdminCandidatePoint,
  generateAdminSuitabilityGrid,
  getAdminCandidatePoints,
  getAdminDataImports,
  getAdminSuitabilityCells,
  promoteAdminDataImport,
  promoteAdminRecommendedSuitabilityCells,
  promoteAdminSuitabilityCell,
  stageAdminGeoJson,
  validateAdminGeoJson,
  updateAdminCandidatePoint
} from "../services/adminService";
import { getChargingStationsWithSource } from "../services/mapDataApi";
import { getRegions } from "../services/regionsApi";
import CandidatePointsMap from "./CandidatePointsMap";

const emptyForm = {
  name: "",
  estimatedAddress: "",
  region: "",
  neighborhood: "",
  estimatedCost: "",
  costScore: "",
  demandScore: "",
  generalScore: "",
  latitude: "",
  longitude: "",
  regionId: "",
  neighborhoodId: "",
  systemType: "",
  placeType: "",
  status: "Draft"
};

const candidateSourceLabels = {
  SYSTEM_ANALYSIS: "Sistem Analizi",
  USER_MANUAL: "Kullanıcı Girişi",
  ADMIN_MANUAL: "Admin Girişi"
};

const analysisStatusLabels = {
  CANDIDATE: "Uygun aday",
  LOW_SUITABILITY: "Düşük uygunluk",
  HARD_EXCLUSION: "Kesin engel",
  INSUFFICIENT_DATA: "Veri doğrulaması gerekli"
};

const analysisReasonLabels = {
  DATASET_COVERAGE_UNVERIFIED: "Veri kapsamı henüz doğrulanmadı.",
  TRANSFORMER_DISTANCE_MISSING: "Trafo mesafesi hesaplanamadı.",
  MAJOR_ROAD_DISTANCE_MISSING: "Ana yol mesafesi hesaplanamadı.",
  STATION_DISTANCE_MISSING: "Şarj istasyonu mesafesi hesaplanamadı.",
  POI_METRIC_MISSING: "POI yoğunluğu hesaplanamadı.",
  POPULATION_DENSITY_MISSING: "Nüfus yoğunluğu hesaplanamadı.",
  SLOPE_DATA_MISSING: "Eğim verisi bulunamadı.",
  MAJOR_ROAD_DISTANCE_WARNING: "Ana yola uzaklık 1 km'nin üzerinde.",
  STEEP_SLOPE_WARNING: "Eğim %15 veya üzerinde; saha kontrolü gerekli."
};

function getCandidateSourceLabel(sourceType) {
  return candidateSourceLabels[sourceType] ?? sourceType ?? "Bilinmiyor";
}

function optionalNumber(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    estimatedAddress: form.estimatedAddress.trim() || null,
    region: form.region.trim() || null,
    neighborhood: form.neighborhood.trim() || null,
    estimatedCost: optionalNumber(form.estimatedCost),
    costScore: optionalNumber(form.costScore),
    demandScore: optionalNumber(form.demandScore),
    generalScore: optionalNumber(form.generalScore),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    regionId: optionalNumber(form.regionId),
    neighborhoodId: optionalNumber(form.neighborhoodId),
    systemType: form.systemType.trim() || null,
    placeType: form.placeType.trim() || null,
    status: form.status.trim() || "Draft"
  };
}

function toForm(candidate) {
  return Object.fromEntries(
    Object.keys(emptyForm).map((key) => [key, candidate?.[key] ?? emptyForm[key]])
  );
}

function AdminMapOverview({ token, hasPermission, onStartAnalysis }) {
  const [candidates, setCandidates] = useState([]);
  const [regions, setRegions] = useState([]);
  const [chargingStations, setChargingStations] = useState([]);
  const [sourceType, setSourceType] = useState("");
  const [analysisRunId, setAnalysisRunId] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showCandidates, setShowCandidates] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showRegions, setShowRegions] = useState(true);
  const [showChargingStations, setShowChargingStations] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedChargingStation, setSelectedChargingStation] = useState(null);
  const [focusedCellId, setFocusedCellId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stationLoading, setStationLoading] = useState(false);
  const [promotionBusy, setPromotionBusy] = useState(false);
  const [stationSource, setStationSource] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCandidates = useCallback(async () => {
    if (!hasPermission("point.read")) return;

    setLoading(true);
    setError("");

    try {
      const result = await getAdminCandidatePoints(token, { sourceType });
      setCandidates(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hasPermission, sourceType, token]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    let isMounted = true;

    getRegions()
      .then((result) => {
        if (!isMounted) return;
        setRegions(Array.isArray(result?.data) ? result.data : []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Bölge verileri yüklenemedi.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function toggleChargingStations() {
    const nextValue = !showChargingStations;
    setShowChargingStations(nextValue);

    if (!nextValue || chargingStations.length > 0) {
      return;
    }

    setStationLoading(true);
    setError("");

    try {
      const result = await getChargingStationsWithSource();
      setChargingStations(Array.isArray(result?.data) ? result.data : []);
      setStationSource(result?.source ?? "");
    } catch (err) {
      setShowChargingStations(false);
      setError(err.message || "Şarj istasyonları yüklenemedi.");
    } finally {
      setStationLoading(false);
    }
  }

  async function loadAnalysis() {
    if (!analysisRunId) {
      setError("Gridleri göstermek için analiz çalışma numarası girin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getAdminSuitabilityCells(token, Number(analysisRunId), {
        minimumScore: 0,
        limit: 5000
      });
      setAnalysisResult(result);
      setSelectedCell(null);
      setFocusedCellId(null);
      setShowAnalysis(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function promoteOverviewCell() {
    if (!analysisRunId || !selectedCell) return;

    setPromotionBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await promoteAdminSuitabilityCell(
        token,
        Number(analysisRunId),
        selectedCell.cellId
      );
      setMessage(
        result?.created
          ? "Seçilen grid sistem adayına dönüştürüldü."
          : "Bu grid daha önce sistem adayına dönüştürülmüş."
      );
      setShowCandidates(true);
      await loadCandidates();
    } catch (err) {
      setError(err.message);
    } finally {
      setPromotionBusy(false);
    }
  }

  const mapCells = analysisResult?.cells ?? [];
  const displayedMapCells = selectedCell && !mapCells.some(
    (cell) => String(cell.cellId) === String(selectedCell.cellId)
  )
    ? [...mapCells, selectedCell]
    : mapCells;

  return (
    <section className="admin-tab-panel">
      <div className="admin-panel admin-wide-panel admin-map-overview">
        <div className="admin-panel-heading">
          <div>
            <span>Yönetim haritası</span>
            <h2>Adaylar ve Analiz Gridleri</h2>
            <p className="admin-muted-text">
              Kayıtlı aday noktaları görüntüleyin; çalışma numarasıyla analiz gridlerini aynı haritaya ekleyin.
            </p>
          </div>
          <div className="admin-action-cell">
            {hasPermission("data.import.execute") && (
              <button type="button" className="admin-primary-button" onClick={onStartAnalysis}>
                Yeni Analiz Oluştur
              </button>
            )}
            <button type="button" className="admin-secondary-button" onClick={loadCandidates} disabled={loading}>
              {loading ? "Yükleniyor..." : "Haritayı Yenile"}
            </button>
          </div>
        </div>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}
        {message && <div className="admin-alert admin-alert-success">{message}</div>}

        <div className="admin-map-toolbar admin-map-overview-toolbar">
          {hasPermission("point.read") && (
            <>
              <label className="admin-analysis-check">
                <input type="checkbox" checked={showCandidates} onChange={(event) => setShowCandidates(event.target.checked)} />
                Aday noktalar
              </label>
              <label>
                Aday kaynağı
                <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
                  <option value="">Tüm adaylar</option>
                  <option value="SYSTEM_ANALYSIS">Sistem Analizi</option>
                  <option value="USER_MANUAL">Kullanıcı Girişi</option>
                  <option value="ADMIN_MANUAL">Admin Girişi</option>
                </select>
              </label>
            </>
          )}
          <label className="admin-analysis-check">
            <input type="checkbox" checked={showRegions} onChange={(event) => setShowRegions(event.target.checked)} />
            Semt sınırları
          </label>
          <label className="admin-analysis-check">
            <input
              type="checkbox"
              checked={showChargingStations}
              onChange={toggleChargingStations}
              disabled={stationLoading}
            />
            {stationLoading ? "Şarj istasyonları yükleniyor" : "Mevcut şarj istasyonları"}
          </label>
          <label>
            Analiz çalışma no
            <input type="number" min="1" value={analysisRunId} onChange={(event) => setAnalysisRunId(event.target.value)} placeholder="Örn. 14" />
          </label>
          <button type="button" className="admin-secondary-button" onClick={loadAnalysis} disabled={loading || !analysisRunId}>
            Analiz Gridlerini Göster
          </button>
          {analysisResult && (
            <label className="admin-analysis-check">
              <input type="checkbox" checked={showAnalysis} onChange={(event) => setShowAnalysis(event.target.checked)} />
              Grid katmanı
            </label>
          )}
        </div>

        <div className="admin-map-overview-stats">
          <span><strong>{candidates.length}</strong> aday nokta</span>
          <span><strong>{showRegions ? regions.filter((region) => region?.boundaryGeoJson).length : 0}</strong> semt</span>
          <span><strong>{showChargingStations ? chargingStations.length : 0}</strong> şarj istasyonu</span>
          <span><strong>{analysisResult?.returnedCellCount ?? 0}</strong> analiz hücresi</span>
          {analysisResult && <span><strong>#{analysisResult.analysisRunId}</strong> aktif çalışma</span>}
          {stationSource && showChargingStations && <span>İstasyon kaynağı: <strong>{stationSource}</strong></span>}
        </div>

        <div className="admin-analysis-map-layout">
          <div className="admin-analysis-map-canvas admin-map-overview-canvas">
            <CandidatePointsMap
              mapMode="admin"
              points={showCandidates ? candidates : []}
              regions={regions}
              regionsActive={showRegions}
              chargingStations={chargingStations}
              chargingStationsActive={showChargingStations}
              selectedChargingStationId={selectedChargingStation?.id ?? null}
              selectedPointId={selectedCandidate?.id ?? null}
              onPointSelect={(candidate) => {
                setSelectedCandidate(candidate);
                setSelectedChargingStation(null);
                setSelectedRegion(null);
                setSelectedCell(null);
              }}
              onChargingStationSelect={(station) => {
                setSelectedChargingStation(station);
                setSelectedCandidate(null);
                setSelectedRegion(null);
                setSelectedCell(null);
              }}
              onRegionSelect={(region) => {
                setSelectedRegion(region);
                setSelectedCandidate(null);
                setSelectedChargingStation(null);
                setSelectedCell(null);
              }}
              analysisCells={displayedMapCells}
              analysisCellsActive={showAnalysis}
              selectedAnalysisCellId={selectedCell?.cellId ?? null}
              focusedRecommendationCellId={focusedCellId}
              onAnalysisCellSelect={(cell) => {
                setSelectedCell(cell);
                setSelectedCandidate(null);
                setSelectedChargingStation(null);
                setSelectedRegion(null);
                setFocusedCellId(null);
              }}
            />
          </div>

          <aside className="admin-analysis-cell-detail">
            {selectedCell ? (
              <>
                <span>Seçilen analiz hücresi</span>
                <strong>{selectedCell.suitabilityScore ?? "-"} puan</strong>
                <p>{selectedCell.neighborhoodName || "Mahalle yok"} / {selectedCell.regionName || "Semt yok"}</p>
                <small>{analysisStatusLabels[selectedCell.evaluationStatus] ?? selectedCell.evaluationStatus}</small>
                {hasPermission("point.create") && (
                  <button
                    type="button"
                    className="admin-analysis-promote"
                    onClick={promoteOverviewCell}
                    disabled={promotionBusy
                      || analysisResult?.gridEdgeMeters !== 200
                      || selectedCell.hasHardExclusion
                      || selectedCell.suitabilityScore < 75
                      || !selectedCell.isProvisionalRecommendation}
                  >
                    {promotionBusy ? "Ekleniyor..." : "Sistem Adayına Dönüştür"}
                  </button>
                )}
              </>
            ) : selectedCandidate ? (
              <>
                <span>Seçilen aday nokta</span>
                <strong>{selectedCandidate.name}</strong>
                <p>{selectedCandidate.neighborhood || "Mahalle yok"} / {selectedCandidate.region || "Semt yok"}</p>
                <small>{getCandidateSourceLabel(selectedCandidate.sourceType)} · {selectedCandidate.generalScore ?? "-"} puan</small>
              </>
            ) : selectedChargingStation ? (
              <>
                <span>Mevcut şarj istasyonu</span>
                <strong>{selectedChargingStation.name || "İsimsiz istasyon"}</strong>
                <p>{selectedChargingStation.neighborhoodName || "Mahalle yok"} / {selectedChargingStation.regionName || "Semt yok"}</p>
                <small>
                  {selectedChargingStation.operatorName || "İşletmeci bilgisi yok"}
                  {selectedChargingStation.maxPowerKw ? ` · ${selectedChargingStation.maxPowerKw} kW` : ""}
                </small>
              </>
            ) : selectedRegion ? (
              <>
                <span>Seçilen semt</span>
                <strong>{selectedRegion.name || selectedRegion.regionName || "Semt bilgisi"}</strong>
                <p>Nüfus: {selectedRegion.population?.toLocaleString("tr-TR") || "Veri yok"}</p>
                <small>Semt sınırı harita üzerinde aktif.</small>
              </>
            ) : (
              <p>Detayları görmek için haritadaki aday noktaya veya analiz hücresine tıklayın.</p>
            )}
          </aside>
        </div>

        {analysisResult && (
          <div className="admin-analysis-extremes">
            <button type="button" className="is-highest" onClick={() => {
              setSelectedCell(analysisResult.highestScoreCell);
              setFocusedCellId(analysisResult.highestScoreCell?.cellId ?? null);
            }}>
              <span>En yüksek hücre</span><strong>{analysisResult.highestScoreCell?.suitabilityScore ?? "-"}</strong>
              <small>{analysisResult.highestScoreCell?.neighborhoodName || "Konum yok"}</small>
            </button>
            <button type="button" className="is-lowest" onClick={() => {
              setSelectedCell(analysisResult.lowestScoreCell);
              setFocusedCellId(analysisResult.lowestScoreCell?.cellId ?? null);
            }}>
              <span>En düşük hücre</span><strong>{analysisResult.lowestScoreCell?.suitabilityScore ?? "-"}</strong>
              <small>{analysisResult.lowestScoreCell?.neighborhoodName || "Konum yok"}</small>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function CandidatePointManagement({ token, hasPermission, onOpenMap, operationMessage = "" }) {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(operationMessage);
  const [error, setError] = useState("");

  const loadCandidates = useCallback(async () => {
    if (!hasPermission("point.read")) return;

    setLoading(true);
    setError("");

    try {
      const result = await getAdminCandidatePoints(token, { search, status, sourceType });
      setCandidates(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hasPermission, search, sourceType, status, token]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(candidate) {
    setEditingId(candidate.id);
    setForm(toForm(candidate));
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  async function saveCandidate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = toPayload(form);

      if (editingId) {
        await updateAdminCandidatePoint(token, editingId, payload);
        setMessage("Aday nokta güncellendi.");
      } else {
        await createAdminCandidatePoint(token, payload);
        setMessage("Aday nokta oluşturuldu.");
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadCandidates();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeCandidate(candidateId) {
    if (!window.confirm("Bu aday noktayı silmek istediğinize emin misiniz?")) return;

    setSaving(true);
    setError("");

    try {
      await deleteAdminCandidatePoint(token, candidateId);
      setMessage("Aday nokta silindi.");
      await loadCandidates();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-tab-panel">
      <div className="admin-panel admin-wide-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Aday Nokta Yönetimi</h2>
            <p className="admin-muted-text">PostGIS üzerindeki aday noktaları yönetin.</p>
            {hasPermission("point.read") && (
              <small>{loading ? "Aday noktalar yükleniyor..." : `${candidates.length} aday nokta listeleniyor.`}</small>
            )}
          </div>
          <div className="admin-action-cell">
            {hasPermission("point.create") && (
              <button type="button" onClick={openCreate}>Yeni Nokta</button>
            )}
            <button type="button" className="admin-secondary-button" onClick={onOpenMap}>
              Haritada Gör
            </button>
          </div>
        </div>

        {(message || error) && (
          <div className={error ? "admin-alert admin-alert-error" : "admin-alert"}>
            {error || message}
          </div>
        )}

        {hasPermission("point.read") ? (
          <>
            <div className="admin-map-toolbar">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ad, adres, semt veya mahalle ara"
                aria-label="Aday nokta ara"
              />
              <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Duruma göre filtrele">
                <option value="">Tüm durumlar</option>
                <option value="Draft">Taslak</option>
                <option value="Approved">Onaylı</option>
                <option value="Rejected">Reddedildi</option>
              </select>
              <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} aria-label="Kaynağa göre filtrele">
                <option value="">Tüm kaynaklar</option>
                <option value="SYSTEM_ANALYSIS">Sistem Analizi</option>
                <option value="USER_MANUAL">Kullanıcı Girişi</option>
                <option value="ADMIN_MANUAL">Admin Girişi</option>
              </select>
              <button type="button" className="admin-secondary-button" onClick={loadCandidates} disabled={loading}>
                Yenile
              </button>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nokta</th>
                    <th>Konum</th>
                    <th>Skor</th>
                    <th>Durum</th>
                    <th>Kaynak</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td><strong>{candidate.name}</strong><small>{candidate.estimatedAddress || "Adres yok"}</small></td>
                      <td>{candidate.region || "-"}<small>{candidate.neighborhood || "Mahalle yok"}</small></td>
                      <td>{candidate.generalScore ?? "-"}</td>
                      <td>{candidate.status || "-"}</td>
                      <td>{getCandidateSourceLabel(candidate.sourceType)}</td>
                      <td>
                        <div className="admin-action-cell">
                          {hasPermission("point.update") && (
                            <button type="button" className="admin-secondary-button" onClick={() => openEdit(candidate)}>Düzenle</button>
                          )}
                          {hasPermission("point.delete") && (
                            <button type="button" className="admin-danger-button" onClick={() => removeCandidate(candidate.id)} disabled={saving}>Sil</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && candidates.length === 0 && (
                    <tr><td colSpan="6" className="admin-empty-cell">Kayıtlı aday nokta bulunamadı.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="admin-muted-text">Aday noktaları görüntüleme yetkiniz yok.</p>
        )}
      </div>

      {formOpen && (
        <div className="admin-modal-backdrop" role="presentation">
          <section className="admin-modal admin-map-modal" role="dialog" aria-modal="true" aria-label="Aday nokta formu">
            <div className="admin-modal-heading">
              <div><span>Harita İşlemleri</span><h2>{editingId ? "Aday Noktayı Düzenle" : "Yeni Aday Nokta"}</h2></div>
              <button type="button" className="admin-close-button" onClick={() => setFormOpen(false)} aria-label="Kapat">×</button>
            </div>
            {error && <div className="admin-alert admin-alert-error">{error}</div>}
            <form className="admin-form admin-map-form" onSubmit={saveCandidate}>
              <label>Ad<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={250} required /></label>
              <label>Adres<input value={form.estimatedAddress} onChange={(event) => setForm({ ...form, estimatedAddress: event.target.value })} maxLength={500} /></label>
              <label>Semt<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} maxLength={150} /></label>
              <label>Mahalle<input value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} maxLength={150} /></label>
              <label>Enlem<input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} required /></label>
              <label>Boylam<input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} required /></label>
              <label>Genel skor<input type="number" min="0" max="100" value={form.generalScore} onChange={(event) => setForm({ ...form, generalScore: event.target.value })} /></label>
              <label>Maliyet<input type="number" min="0" step="0.01" value={form.estimatedCost} onChange={(event) => setForm({ ...form, estimatedCost: event.target.value })} /></label>
              <label>Sistem tipi<input value={form.systemType} onChange={(event) => setForm({ ...form, systemType: event.target.value })} maxLength={100} /></label>
              <label>Yer tipi<input value={form.placeType} onChange={(event) => setForm({ ...form, placeType: event.target.value })} maxLength={100} /></label>
              <label>Durum<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="Draft">Taslak</option><option value="Approved">Onaylı</option><option value="Rejected">Reddedildi</option></select></label>
              <button type="submit" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function DataImportManagement({ token, hasPermission }) {
  const [file, setFile] = useState(null);
  const [imports, setImports] = useState([]);
  const [validation, setValidation] = useState(null);
  const [staging, setStaging] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadImports = useCallback(async () => {
    if (!hasPermission("data.import.validate")) return;

    try {
      const result = await getAdminDataImports(token);
      setImports(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    }
  }, [hasPermission, token]);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  async function validateFile() {
    if (!file) return;
    setBusy(true);
    setError("");
    setStaging(null);

    try {
      setValidation(await validateAdminGeoJson(token, file));
    } catch (err) {
      setValidation(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function stageFile() {
    if (!file) return;
    setBusy(true);
    setError("");

    try {
      const result = await stageAdminGeoJson(token, file);
      setStaging(result);
      setValidation(result?.validation ?? validation);
      await loadImports();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function promoteImport(importId) {
    setBusy(true);
    setError("");

    try {
      setStaging(await promoteAdminDataImport(token, importId));
      await loadImports();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-tab-panel">
      <div className="admin-panel admin-wide-panel">
        <div className="admin-panel-heading"><div><h2>GeoJSON Veri Aktarımı</h2><p className="admin-muted-text">Dosyayı doğrulayın, staging alanına aktarın ve desteklenen katmanları GIS tablolarına taşıyın.</p></div></div>
        {error && <div className="admin-alert admin-alert-error">{error}</div>}

        <div className="admin-import-box">
          <label>
            GeoJSON dosyası
            <input type="file" accept=".geojson,application/geo+json,application/json" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setValidation(null); setStaging(null); }} />
          </label>
          <div className="admin-action-cell">
            {hasPermission("data.import.validate") && <button type="button" className="admin-secondary-button" onClick={validateFile} disabled={!file || busy}>Doğrula</button>}
            {hasPermission("data.import.execute") && <button type="button" onClick={stageFile} disabled={!file || busy}>Staging'e Aktar</button>}
          </div>
        </div>

        {validation && (
          <div className={validation.isValid ? "admin-alert" : "admin-alert admin-alert-error"}>
            <strong>{validation.isValid ? "Doğrulama başarılı" : "Doğrulama başarısız"}</strong>
            <span>{validation.datasetCode || "Bilinmeyen veri seti"} · {validation.featureCount} kayıt · {validation.geometryTypes?.join(", ")}</span>
            {validation.warnings?.map((warning) => <small key={warning}>{warning}</small>)}
          </div>
        )}

        {staging && <div className="admin-alert"><strong>{staging.message || staging.status}</strong>{staging.datasetImportId && <span>Aktarım No: {staging.datasetImportId}</span>}</div>}

        <div className="admin-panel-heading admin-section-heading"><h3>Son Aktarımlar</h3><button type="button" className="admin-secondary-button" onClick={loadImports}>Yenile</button></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>No</th><th>Veri seti</th><th>Kayıt</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead>
            <tbody>
              {imports.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td><td><strong>{item.datasetName}</strong><small>{item.sourceFile}</small></td><td>{item.featureCount}</td><td>{item.status}</td><td>{new Date(item.importedAtUtc).toLocaleString("tr-TR")}</td>
                  <td>{hasPermission("data.import.execute") && item.status !== "Promoted" && <button type="button" className="admin-secondary-button" onClick={() => promoteImport(item.id)} disabled={busy}>GIS'e Aktar</button>}</td>
                </tr>
              ))}
              {imports.length === 0 && <tr><td colSpan="6" className="admin-empty-cell">Aktarım kaydı bulunamadı.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SuitabilityAnalysisManagement({ token, hasPermission, onOpenCandidates }) {
  const [districtSourceId, setDistrictSourceId] = useState("1231");
  const gridEdgeMeters = "200";
  const [analysisRunId, setAnalysisRunId] = useState("");
  const [results, setResults] = useState({ grid: null, metrics: null, scores: null });
  const [activeStep, setActiveStep] = useState(0);
  const [mapResult, setMapResult] = useState(null);
  const [mapCandidates, setMapCandidates] = useState([]);
  const [selectedMapCell, setSelectedMapCell] = useState(null);
  const [focusedMapCellId, setFocusedMapCellId] = useState(null);
  const [minimumMapScore, setMinimumMapScore] = useState("0");
  const [evaluationStatus, setEvaluationStatus] = useState("");
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCandidates, setShowCandidates] = useState(false);
  const [candidateSourceType, setCandidateSourceType] = useState("");
  const [mapLoading, setMapLoading] = useState(false);
  const [promotionBusy, setPromotionBusy] = useState(false);
  const [bulkPromotionBusy, setBulkPromotionBusy] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalysisMap(runId = analysisRunId) {
    if (!runId) return;

    setMapLoading(true);
    setError("");

    try {
      const [cells, candidates] = await Promise.all([
        getAdminSuitabilityCells(token, Number(runId), {
          minimumScore: minimumMapScore,
          evaluationStatus,
          onlyRecommended,
          limit: 5000
        }),
        showCandidates && hasPermission("point.read")
          ? getAdminCandidatePoints(token, { sourceType: candidateSourceType })
          : Promise.resolve([])
      ]);

      setMapResult(cells);
      setMapCandidates(Array.isArray(candidates) ? candidates : []);
      setSelectedMapCell(null);
      setFocusedMapCellId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setMapLoading(false);
    }
  }

  async function promoteSelectedCell() {
    if (!analysisRunId || !selectedMapCell) return;

    setPromotionBusy(true);
    setError("");
    setAnalysisMessage("");

    try {
      const result = await promoteAdminSuitabilityCell(
        token,
        Number(analysisRunId),
        selectedMapCell.cellId
      );
      const promotionMessage =
        result?.created
          ? "Seçilen hücre sistem adayına dönüştürüldü."
          : "Bu hücre zaten aday noktalar arasında bulunuyor.";
      setAnalysisMessage(promotionMessage);
      setShowCandidates(true);
      setCandidateSourceType("SYSTEM_ANALYSIS");
      const candidates = await getAdminCandidatePoints(token, { sourceType: "SYSTEM_ANALYSIS" });
      setMapCandidates(Array.isArray(candidates) ? candidates : []);
      if (hasPermission("point.read")) {
        onOpenCandidates(promotionMessage);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPromotionBusy(false);
    }
  }

  async function promoteRecommendedCells() {
    if (!analysisRunId) return;
    if (!window.confirm("Bu analizdeki 75+ puanlı sabit hexagonlar aday noktalarla eşleştirilsin mi?")) return;

    setBulkPromotionBusy(true);
    setError("");
    setAnalysisMessage("");

    try {
      const result = await promoteAdminRecommendedSuitabilityCells(token, Number(analysisRunId));
      const promotionMessage =
        result?.createdCount > 0
          ? `${result.createdCount} sistem önerisi aday noktalara eklendi. ${result.alreadyExistingCount} kayıt daha önce eklenmişti.`
          : `Yeni aday eklenmedi; uygun ${result?.eligibleCellCount ?? 0} hücrenin tamamı zaten aday noktalar listesinde.`;
      setAnalysisMessage(promotionMessage);
      setShowCandidates(true);
      setCandidateSourceType("SYSTEM_ANALYSIS");
      const candidates = await getAdminCandidatePoints(token, { sourceType: "SYSTEM_ANALYSIS" });
      setMapCandidates(Array.isArray(candidates) ? candidates : []);
      if (hasPermission("point.read")) {
        onOpenCandidates(promotionMessage);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkPromotionBusy(false);
    }
  }

  function focusScoreCell(cell) {
    if (!cell) return;

    setShowGrid(true);
    setSelectedMapCell(cell);
    setFocusedMapCellId(cell.cellId);
  }

  async function runFullAnalysis() {
    setBusy(true);
    setError("");
    setResults({ grid: null, metrics: null, scores: null });
    setActiveStep(1);

    try {
      const grid = await generateAdminSuitabilityGrid(
        token,
        Number(districtSourceId),
        Number(gridEdgeMeters)
      );
      const runId = grid.analysisRunId;
      setAnalysisRunId(String(runId));
      setResults((current) => ({ ...current, grid }));

      setActiveStep(2);
      const metrics = await calculateAdminSuitabilityMetrics(token, runId);
      setResults((current) => ({ ...current, metrics }));

      setActiveStep(3);
      const scores = await calculateAdminSuitabilityScores(token, runId);
      setResults({ grid, metrics, scores });
      setActiveStep(4);
      await loadAnalysisMap(runId);
    } catch (err) {
      setError(err.message);
      setActiveStep(-1);
    } finally {
      setBusy(false);
    }
  }

  async function continueAnalysis(action) {
    if (!analysisRunId) return;
    setBusy(true);
    setError("");

    try {
      if (action === "metrics") {
        setActiveStep(2);
        const metrics = await calculateAdminSuitabilityMetrics(token, Number(analysisRunId));
        setResults((current) => ({ ...current, metrics }));
        setActiveStep(3);
      } else {
        setActiveStep(3);
        const scores = await calculateAdminSuitabilityScores(token, Number(analysisRunId));
        setResults((current) => ({ ...current, scores }));
        setActiveStep(4);
      }
    } catch (err) {
      setError(err.message);
      setActiveStep(-1);
    } finally {
      setBusy(false);
    }
  }

  const stepLabels = [
    "Alan hücrelere ayrılıyor",
    "Konumsal veriler hesaplanıyor",
    "Uygunluk puanları oluşturuluyor"
  ];

  const scoreResult = results.scores;
  const metricResult = results.metrics;
  const gridResult = results.grid;
  const visibleAnalysisCells = mapResult?.cells ?? [];
  const displayedAnalysisCells = selectedMapCell && !visibleAnalysisCells.some(
    (cell) => String(cell.cellId) === String(selectedMapCell.cellId)
  )
    ? [...visibleAnalysisCells, selectedMapCell]
    : visibleAnalysisCells;

  return (
    <section className="admin-tab-panel">
      <div className="admin-panel admin-wide-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Uygunluk Analizi</h2>
            <p className="admin-muted-text">
              Çankaya'yı tarayarak trafo, yol, şarj istasyonu, POI, nüfus ve eğim verilerine göre uygun alanları puanlar.
            </p>
          </div>
        </div>
        {error && <div className="admin-alert admin-alert-error">{error}</div>}
        {analysisMessage && <div className="admin-alert">{analysisMessage}</div>}

        <div className="admin-analysis-launcher">
          <div className="admin-analysis-settings">
            <div className="admin-analysis-scope">
              <span>Analiz kapsamı</span>
              <strong>Çankaya ilçesinin tamamı</strong>
              <small>İlçe sınırı içindeki tüm alanlar hücrelere bölünerek taranır.</small>
            </div>
            <div className="admin-analysis-scope">
              <span>Sabit aday evreni</span>
              <strong>200 metrelik yaklaşık 4.635 hexagon</strong>
              <small>Her analiz aynı hexagonları puanlar; çözünürlük değiştirerek yeni ve çakışan gridler oluşturmaz.</small>
            </div>
          </div>
          <button
            type="button"
            className="admin-analysis-start"
            onClick={runFullAnalysis}
            disabled={busy}
          >
            {busy ? "Analiz devam ediyor..." : "Tam Analizi Başlat"}
          </button>
          <small>Üç hesaplama adımı otomatik olarak ve doğru sırayla çalıştırılır.</small>
        </div>

        <div className="admin-analysis-progress" aria-label="Analiz ilerlemesi">
          {stepLabels.map((label, index) => {
            const stepNumber = index + 1;
            const completed = activeStep > stepNumber;
            const running = activeStep === stepNumber;

            return (
              <div className={`${completed ? "is-completed" : ""} ${running ? "is-running" : ""}`} key={label}>
                <span>{completed ? "✓" : stepNumber}</span>
                <strong>{label}</strong>
                <small>{completed ? "Tamamlandı" : running ? "İşleniyor" : "Bekliyor"}</small>
              </div>
            );
          })}
        </div>

        {scoreResult && (
          <div className="admin-analysis-result">
            <div className="admin-panel-heading">
              <div><span>Analiz tamamlandı</span><h3>Sonuç Özeti</h3></div>
              <span className="admin-role-pill">Çalışma #{scoreResult.analysisRunId}</span>
            </div>
            <dl>
              <div><dt>Analiz edilen alan</dt><dd>{gridResult?.districtName || "Çankaya"}</dd></div>
              <div><dt>Hücre boyutu</dt><dd>{gridResult?.gridEdgeMeters ?? gridEdgeMeters} metre</dd></div>
              <div><dt>İncelenen hücre</dt><dd>{scoreResult.scoredCellCount ?? gridResult?.cellCount ?? "-"}</dd></div>
              <div><dt>Önerilebilir alan</dt><dd>{scoreResult.provisionalRecommendedCellCount ?? "-"}</dd></div>
              <div><dt>Ortalama puan</dt><dd>{scoreResult.averageScore ?? "-"}</dd></div>
              <div><dt>En yüksek puan</dt><dd>{scoreResult.maximumScore ?? "-"}</dd></div>
              <div><dt>En düşük puan</dt><dd>{scoreResult.minimumScore ?? "-"}</dd></div>
              <div><dt>Veri kapsamı</dt><dd>{scoreResult.datasetCoverageVerified ? "Doğrulandı" : "Eksik/Doğrulanmadı"}</dd></div>
            </dl>
            <div className="admin-analysis-note">
              <span>75+ puanlı sistem önerileri sabit hexagon kimlikleri üzerinden aday noktalarla eşleştirilir.</span>
              {hasPermission("point.create") && (
                <button
                  type="button"
                  className="admin-analysis-promote"
                  onClick={promoteRecommendedCells}
                  disabled={bulkPromotionBusy || gridResult?.gridEdgeMeters !== 200}
                >
                  {bulkPromotionBusy ? "Hexagonlar eşleştiriliyor..." : "75+ Sistem Önerilerini Adaylarla Eşleştir"}
                </button>
              )}
            </div>
          </div>
        )}

        {scoreResult && (
          <div className="admin-analysis-map-section">
            <div className="admin-panel-heading">
              <div>
                <span>Konumsal sonuçlar</span>
                <h3>Puan Haritası</h3>
              </div>
              <button type="button" className="admin-secondary-button" onClick={() => loadAnalysisMap()} disabled={mapLoading}>
                {mapLoading ? "Yükleniyor..." : "Haritayı Güncelle"}
              </button>
            </div>

            <div className="admin-analysis-map-filters">
              <label>
                Minimum puan
                <input type="number" min="0" max="100" value={minimumMapScore} onChange={(event) => setMinimumMapScore(event.target.value)} />
              </label>
              <label>
                Değerlendirme durumu
                <select value={evaluationStatus} onChange={(event) => setEvaluationStatus(event.target.value)}>
                  <option value="">Tüm durumlar</option>
                  <option value="CANDIDATE">Uygun aday</option>
                  <option value="LOW_SUITABILITY">Düşük uygunluk</option>
                  <option value="HARD_EXCLUSION">Kesin engel</option>
                  <option value="INSUFFICIENT_DATA">Veri doğrulaması gerekli</option>
                </select>
              </label>
              <label className="admin-analysis-check"><input type="checkbox" checked={onlyRecommended} onChange={(event) => setOnlyRecommended(event.target.checked)} />Yalnızca sistem önerileri</label>
              <label className="admin-analysis-check"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />Analiz gridleri</label>
              {hasPermission("point.read") && <label className="admin-analysis-check"><input type="checkbox" checked={showCandidates} onChange={(event) => setShowCandidates(event.target.checked)} />Kayıtlı aday noktalar</label>}
              {showCandidates && hasPermission("point.read") && (
                <label>
                  Aday kaynağı
                  <select value={candidateSourceType} onChange={(event) => setCandidateSourceType(event.target.value)}>
                    <option value="">Tüm adaylar</option>
                    <option value="SYSTEM_ANALYSIS">Sistem Analizi</option>
                    <option value="USER_MANUAL">Kullanıcı Girişi</option>
                    <option value="ADMIN_MANUAL">Admin Girişi</option>
                  </select>
                </label>
              )}
            </div>

            <div className="admin-analysis-extremes">
              <button
                type="button"
                className="is-highest"
                onClick={() => focusScoreCell(mapResult?.highestScoreCell)}
                disabled={!mapResult?.highestScoreCell}
              >
                <span>En yüksek puanlı hücre</span>
                <strong>{mapResult?.highestScoreCell?.suitabilityScore ?? "-"}</strong>
                <small>
                  {[mapResult?.highestScoreCell?.neighborhoodName, mapResult?.highestScoreCell?.regionName]
                    .filter(Boolean)
                    .join(" / ") || "Konum bulunamadı"}
                </small>
              </button>
              <button
                type="button"
                className="is-lowest"
                onClick={() => focusScoreCell(mapResult?.lowestScoreCell)}
                disabled={!mapResult?.lowestScoreCell}
              >
                <span>En düşük puanlı hücre</span>
                <strong>{mapResult?.lowestScoreCell?.suitabilityScore ?? "-"}</strong>
                <small>
                  {[mapResult?.lowestScoreCell?.neighborhoodName, mapResult?.lowestScoreCell?.regionName]
                    .filter(Boolean)
                    .join(" / ") || "Konum bulunamadı"}
                </small>
              </button>
            </div>

            {mapResult?.matchingCellCount > mapResult?.returnedCellCount && (
              <div className="admin-alert">
                Performans için en yüksek puanlı {mapResult.returnedCellCount} hücre gösteriliyor; filtreyi daraltabilirsiniz.
              </div>
            )}

            <div className="admin-analysis-map-layout">
              <div className="admin-analysis-map-canvas">
                <CandidatePointsMap
                  mapMode="admin"
                  points={showCandidates ? mapCandidates : []}
                  analysisCells={displayedAnalysisCells}
                  analysisCellsActive={showGrid}
                  selectedAnalysisCellId={selectedMapCell?.cellId ?? null}
                  focusedRecommendationCellId={focusedMapCellId}
                  onAnalysisCellSelect={(cell) => {
                    setSelectedMapCell(cell);
                    setFocusedMapCellId(null);
                  }}
                />
              </div>

              <aside className="admin-analysis-cell-detail">
                {selectedMapCell ? (
                  <>
                    <span>Seçilen hücre</span>
                    <strong>{selectedMapCell.suitabilityScore ?? "-"} puan</strong>
                    <div className="admin-analysis-cell-badges">
                      <span>{analysisStatusLabels[selectedMapCell.evaluationStatus] ?? selectedMapCell.evaluationStatus ?? "Değerlendirilmedi"}</span>
                      <span className={selectedMapCell.datasetCoverageVerified ? "is-verified" : "is-warning"}>
                        {selectedMapCell.datasetCoverageVerified ? "Veri kapsamı doğrulandı" : "Veri kapsamı eksik"}
                      </span>
                    </div>
                    <dl>
                      <div><dt>Semt</dt><dd>{selectedMapCell.regionName || "-"}</dd></div>
                      <div><dt>Mahalle</dt><dd>{selectedMapCell.neighborhoodName || "-"}</dd></div>
                      <div><dt>Trafo uzaklığı</dt><dd>{selectedMapCell.metrics?.nearestTransformerMeters?.toFixed?.(0) ?? "-"} m</dd></div>
                      <div><dt>Ana yol uzaklığı</dt><dd>{selectedMapCell.metrics?.nearestMajorRoadMeters?.toFixed?.(0) ?? "-"} m</dd></div>
                      <div><dt>Şarj istasyonu uzaklığı</dt><dd>{selectedMapCell.metrics?.nearestStationMeters?.toFixed?.(0) ?? "-"} m</dd></div>
                      <div><dt>500 m POI</dt><dd>{selectedMapCell.metrics?.poiCount500Meters ?? "-"}</dd></div>
                      <div><dt>Nüfus yoğunluğu</dt><dd>{selectedMapCell.metrics?.populationDensityPerSquareKilometer?.toFixed?.(0) ?? "-"}</dd></div>
                      <div><dt>Eğim yüzdesi</dt><dd>{selectedMapCell.metrics?.slopePercent ?? "-"}%</dd></div>
                    </dl>
                    <div className="admin-analysis-score-breakdown">
                      <h4>Puan bileşenleri</h4>
                      <dl>
                        <div><dt>Trafo</dt><dd>{selectedMapCell.scores?.transformerScore ?? "-"}</dd></div>
                        <div><dt>Ana yol</dt><dd>{selectedMapCell.scores?.majorRoadScore ?? "-"}</dd></div>
                        <div><dt>POI</dt><dd>{selectedMapCell.scores?.poiScore ?? "-"}</dd></div>
                        <div><dt>Nüfus</dt><dd>{selectedMapCell.scores?.populationScore ?? "-"}</dd></div>
                        <div><dt>İstasyon boşluğu</dt><dd>{selectedMapCell.scores?.stationGapScore ?? "-"}</dd></div>
                        <div><dt>Eğim puanı</dt><dd>{selectedMapCell.scores?.slopeScore ?? "-"}</dd></div>
                      </dl>
                    </div>
                    {selectedMapCell.reasonCodes?.length > 0 && (
                      <div className="admin-analysis-cell-reasons">
                        <h4>Uyarılar</h4>
                        <ul>
                          {selectedMapCell.reasonCodes.map((reasonCode) => (
                            <li key={reasonCode}>{analysisReasonLabels[reasonCode] ?? reasonCode}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasPermission("point.create") && (
                      <button
                        type="button"
                        className="admin-analysis-promote"
                        onClick={promoteSelectedCell}
                        disabled={promotionBusy
                          || mapResult?.gridEdgeMeters !== 200
                          || selectedMapCell.hasHardExclusion
                          || selectedMapCell.suitabilityScore < 75
                          || !selectedMapCell.isProvisionalRecommendation}
                      >
                        {promotionBusy ? "Ekleniyor..." : "Sistem Adayına Dönüştür"}
                      </button>
                    )}
                  </>
                ) : (
                  <p>Detaylarını görmek için haritadaki renkli bir hücreye tıklayın.</p>
                )}
              </aside>
            </div>
            <div className="admin-analysis-map-legend"><span className="is-low">0–34</span><span className="is-medium-low">35–54</span><span className="is-medium">55–74</span><span className="is-high">75–100</span></div>
          </div>
        )}

        {metricResult && !scoreResult && (
          <div className="admin-alert">
            {metricResult.cellCount} hücrenin konumsal metrikleri hesaplandı. Skorlama adımı bekleniyor.
          </div>
        )}

        <details className="admin-analysis-advanced">
          <summary>Gelişmiş / yarım kalan analize devam et</summary>
          <div>
            <label>İlçe kaynak ID<input type="number" min="1" value={districtSourceId} onChange={(event) => setDistrictSourceId(event.target.value)} disabled={busy} /></label>
            <label>Analiz çalışma No<input type="number" min="1" value={analysisRunId} onChange={(event) => setAnalysisRunId(event.target.value)} disabled={busy} /></label>
            <button type="button" className="admin-secondary-button" onClick={() => continueAnalysis("metrics")} disabled={busy || !analysisRunId}>Metrikleri Yeniden Hesapla</button>
            <button type="button" className="admin-secondary-button" onClick={() => continueAnalysis("scores")} disabled={busy || !analysisRunId}>Skorlamaya Devam Et</button>
          </div>
        </details>
      </div>
    </section>
  );
}

export default function AdminMapOperations({ token, hasPermission }) {
  const candidateAccess = ["point.read", "point.create", "point.update", "point.delete"].some(hasPermission);
  const importAccess = hasPermission("data.import.validate") || hasPermission("data.import.execute");
  const [activeOperation, setActiveOperation] = useState("map");
  const [candidateOperationMessage, setCandidateOperationMessage] = useState("");

  return (
    <>
      <div className="admin-user-action-grid admin-map-operation-tabs">
        <button
          type="button"
          className={`admin-user-action-card ${activeOperation === "map" ? "is-active" : ""}`}
          onClick={() => setActiveOperation("map")}
        >
          <span>01</span>
          <strong>Harita Görünümü</strong>
          <small>Adayları, semtleri, istasyonları ve analiz gridlerini haritada incele.</small>
        </button>
        {candidateAccess && (
          <button
            type="button"
            className={`admin-user-action-card ${activeOperation === "candidates" ? "is-active" : ""}`}
            onClick={() => {
              setCandidateOperationMessage("");
              setActiveOperation("candidates");
            }}
          >
            <span>02</span>
            <strong>Aday Noktalar</strong>
            <small>Sistem, kullanıcı ve yönetici kaynaklı aday noktaları yönet.</small>
          </button>
        )}
        {importAccess && (
          <button
            type="button"
            className={`admin-user-action-card ${activeOperation === "imports" ? "is-active" : ""}`}
            onClick={() => setActiveOperation("imports")}
          >
            <span>03</span>
            <strong>Veri Aktarımı</strong>
            <small>Coğrafi veri dosyalarını doğrula, hazırla ve PostGIS'e aktar.</small>
          </button>
        )}
        {hasPermission("data.import.execute") && (
          <button
            type="button"
            className={`admin-user-action-card ${activeOperation === "analysis" ? "is-active" : ""}`}
            onClick={() => setActiveOperation("analysis")}
          >
            <span>04</span>
            <strong>Uygunluk Analizi</strong>
            <small>Sabit aday hexagonlarını konumsal verilere göre puanla ve karşılaştır.</small>
          </button>
        )}
      </div>
      {activeOperation === "map" && (
        <AdminMapOverview
          token={token}
          hasPermission={hasPermission}
          onStartAnalysis={() => setActiveOperation("analysis")}
        />
      )}
      {activeOperation === "candidates" && (
        <CandidatePointManagement
          token={token}
          hasPermission={hasPermission}
          onOpenMap={() => setActiveOperation("map")}
          operationMessage={candidateOperationMessage}
        />
      )}
      {activeOperation === "imports" && <DataImportManagement token={token} hasPermission={hasPermission} />}
      {activeOperation === "analysis" && (
        <SuitabilityAnalysisManagement
          token={token}
          hasPermission={hasPermission}
          onOpenCandidates={(message) => {
            setCandidateOperationMessage(message);
            setActiveOperation("candidates");
          }}
        />
      )}
    </>
  );
}
