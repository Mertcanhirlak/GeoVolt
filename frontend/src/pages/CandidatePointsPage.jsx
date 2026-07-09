import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCandidatePoints } from "../services/candidatePointsApi";
import { saveCandidatePoint } from "../services/savedCandidatePointsApi";
import { getRegions, getRegionSummary } from "../services/regionsApi";
import { useAuth } from "../context/AuthContext";
import CandidateFilters from "../components/CandidateFilters";
import SavedCandidates from "../components/SavedCandidates";
import PersonalizationForm from "../components/PersonalizationForm";
import ExistingStationsMap from "../components/ExistingStationsMap";
import logoutLogo from "../assets/cikis_logo.png";

const defaultFilters = {
  costMin: "",
  costMax: "",
  demandMin: "",
  demandMax: "",
  generalMin: "",
  generalMax: "",
};

function getNumberOrDefault(value, defaultValue) {
  if (value === "" || value === null || value === undefined) {
    return defaultValue;
  }

  return Number(value);
}

function isScoreInRange(score, min, max) {
  if (score === null || score === undefined) {
    return false;
  }

  return score >= min && score <= max;
}

function formatMoney(value) {
  if (value === null || value === undefined) {
    return "Veri Eksik";
  }

  return `${value.toLocaleString("tr-TR")} TL`;
}

function showScore(value) {
  if (value === null || value === undefined) {
    return "Veri Eksik";
  }

  return value;
}

export default function CandidatePointsPage() {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [personalizedCandidates, setPersonalizedCandidates] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedRegionSummary, setSelectedRegionSummary] = useState(null);
  const [regionSummaryMessage, setRegionSummaryMessage] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [message, setMessage] = useState("");
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [stationSearch, setStationSearch] = useState("");
  const [homeMapStep, setHomeMapStep] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadCandidatePoints() {
      setMessage("Hesaplaniyor...");

      const result = await getCandidatePoints();

      if (!isMounted) return;

      setCandidates(result.data);
      setFilteredCandidates(result.data);
      setPersonalizedCandidates(result.data);
      setSelectedCandidate(result.data[0] || null);

      setMessage(result.source === "local-mock" ? "Backend erisilemedi. Lokal mock veri gosteriliyor." : "");
    }

    loadCandidatePoints();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRegions() {
      const result = await getRegions();
      if (isMounted) {
        setRegions(result.data);
      }
    }

    loadRegions();

    return () => {
      isMounted = false;
    };
  }, []);

  function validateFilters() {
    const values = Object.values(filters).filter((value) => value !== "");

    for (const value of values) {
      const numberValue = Number(value);

      if (Number.isNaN(numberValue) || numberValue < 0 || numberValue > 100) {
        setMessage("Skor degerleri 0 ile 100 arasinda olmalidir.");
        return false;
      }
    }

    const costMin = getNumberOrDefault(filters.costMin, 0);
    const costMax = getNumberOrDefault(filters.costMax, 100);
    const demandMin = getNumberOrDefault(filters.demandMin, 0);
    const demandMax = getNumberOrDefault(filters.demandMax, 100);
    const generalMin = getNumberOrDefault(filters.generalMin, 0);
    const generalMax = getNumberOrDefault(filters.generalMax, 100);

    if (costMin > costMax || demandMin > demandMax || generalMin > generalMax) {
      setMessage("Minimum deger maksimum degerden buyuk olamaz.");
      return false;
    }

    return true;
  }

  function applyFilters() {
    if (!validateFilters()) return;

    const costMin = getNumberOrDefault(filters.costMin, 0);
    const costMax = getNumberOrDefault(filters.costMax, 100);
    const demandMin = getNumberOrDefault(filters.demandMin, 0);
    const demandMax = getNumberOrDefault(filters.demandMax, 100);
    const generalMin = getNumberOrDefault(filters.generalMin, 0);
    const generalMax = getNumberOrDefault(filters.generalMax, 100);

    const result = candidates.filter((candidate) => {
      return (
        isScoreInRange(candidate.costScore, costMin, costMax) &&
        isScoreInRange(candidate.demandScore, demandMin, demandMax) &&
        isScoreInRange(candidate.generalScore, generalMin, generalMax)
      );
    });

    setFilteredCandidates(result);
    setSelectedCandidate(result[0] || null);
    setMessage(result.length === 0 ? "Uygun aday nokta bulunamadi." : "Filtreleme uygulandi.");
  }

  async function saveCandidate(candidate) {
    const result = await saveCandidatePoint(candidate);

    if (result.status === "already-saved") {
      setMessage("Bu aday nokta zaten kaydedilmis.");
      return;
    }

    if (result.status === "limit-exceeded") {
      setMessage("En fazla 10 aday nokta kaydedebilirsiniz.");
      return;
    }

    setSavedRefreshKey((currentKey) => currentKey + 1);

    if (result.source === "api") {
      setMessage("Aday nokta API uzerinden kaydedildi.");
      return;
    }

    if (result.source === "api-and-local-storage") {
      setMessage("Aday nokta API ve lokal veriye kaydedildi.");
      return;
    }

    setMessage("Aday nokta lokal olarak kaydedildi.");
  }

  function handlePersonalizedResult(result) {
    setPersonalizedCandidates(result);
    setFilteredCandidates(result);
    setSelectedCandidate(result[0] || null);
  }

  async function handleRegionChange(regionId) {
    const result = await getRegionSummary(regionId);

    setSelectedRegionSummary(result.data);

    if (result.source === "api") {
      setRegionSummaryMessage("Bolge ozeti API uzerinden getirildi.");
      return;
    }

    if (result.source === "local-mock") {
      setRegionSummaryMessage("Bolge ozeti lokal mock veriden gosteriliyor.");
      return;
    }

    setRegionSummaryMessage("");
  }

  function showCandidateOnMap(candidate) {
    setFilteredCandidates([candidate]);
    setSelectedCandidate(candidate);
    setActiveTab("candidateMap");
  }

  function openCandidateMap() {
    setFilteredCandidates(candidates);
    setSelectedCandidate(candidates[0] || null);
    setActiveTab("candidateMap");
  }

  function handleLogout() {
    logoutUser();
    navigate("/login", { replace: true });
  }

  return (
    <div className="candidate-page" data-testid="candidate-points-page">
      <aside className="left-menu" data-testid="left-menu">
        <button
          className={activeTab === "home" ? "menu-button active" : "menu-button"}
          data-testid="home-tab-button"
          onClick={() => setActiveTab("home")}
          title="Mevcut istasyon haritasi"
        >
          <span className="menu-icon">{"\u{1F3E0}"}</span>
        </button>

        <button
          className={activeTab === "candidateMap" ? "menu-button active" : "menu-button"}
          data-testid="candidate-map-tab-button"
          onClick={openCandidateMap}
          title="Aday nokta haritasi"
        >
          <span className="menu-icon">{"\u26A1"}</span>
        </button>

        <button
          className={activeTab === "saved" ? "menu-button active" : "menu-button"}
          data-testid="saved-tab-button"
          onClick={() => setActiveTab("saved")}
          title="Kaydedilenler"
        >
          <span className="menu-icon">{"\u2630"}</span>
        </button>

        <button
          className={activeTab === "personalization" ? "menu-button active" : "menu-button"}
          data-testid="personalization-tab-button"
          onClick={() => setActiveTab("personalization")}
          title="Kisisellestirme"
        >
          <span className="menu-icon">{"\u{1F58C}"}</span>
        </button>

        <button
          className="menu-button logout-menu-button"
          data-testid="logout-button"
          onClick={handleLogout}
          title="Cikis yap"
        >
          <img src={logoutLogo} alt="" className="logout-menu-icon" />
        </button>
      </aside>

      <main className="page-content">
        {activeTab === "home" && (
          <section className="map-screen" data-testid="home-map-screen">
            <div className="map-topbar">
              <input
                className="map-search"
                data-testid="home-search-input"
                placeholder="Adres veya mahalle ara"
                value={stationSearch}
                onChange={(event) => setStationSearch(event.target.value)}
              />

              <div className="map-step-control" aria-label="Harita gorunum adimlari">
                {[1, 2, 3].map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={homeMapStep === step ? "map-step-button active" : "map-step-button"}
                    onClick={() => setHomeMapStep(step)}
                    title={
                      step === 1
                        ? "Mevcut istasyonlar"
                        : step === 2
                          ? "Bolgeler"
                          : "Bolge detayi"
                    }
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>

            <div className="mock-map">
              <ExistingStationsMap searchTerm={stationSearch} mapStep={homeMapStep} />
            </div>
          </section>
        )}

        {activeTab === "candidateMap" && (
          <section className="map-screen" data-testid="candidate-map-screen">
            <div className="map-topbar">
              <input
                className="map-search"
                data-testid="candidate-search-input"
                placeholder="Aday nokta veya mahalle ara"
              />

              <span className="region-toggle">Bolgeler inaktif</span>
            </div>

            <div className="mock-map candidate-map">
              <h1>Aday Nokta Haritasi</h1>

              <p>
                Aday nokta pinlerine tiklayarak detay kartini harita uzerinde
                goruntuleyebilirsiniz.
              </p>

              {filteredCandidates.map((candidate, index) => (
                <button
                  key={candidate.id}
                  className={`candidate-pin pin-${index + 1} ${
                    selectedCandidate?.id === candidate.id ? "selected-pin" : ""
                  }`}
                  data-testid={`candidate-map-pin-${candidate.id}`}
                  title={candidate.name}
                  onClick={() => setSelectedCandidate(candidate)}
                ></button>
              ))}

              {selectedCandidate && (
                <div
                  className="map-candidate-popup"
                  data-testid={`map-candidate-popup-${selectedCandidate.id}`}
                >
                  <button
                    className="popup-close-button"
                    data-testid="candidate-popup-close-button"
                    onClick={() => setSelectedCandidate(null)}
                  >
                    x
                  </button>

                  <small>{selectedCandidate.estimatedAddress}</small>

                  <h3 data-testid={`popup-candidate-name-${selectedCandidate.id}`}>
                    {selectedCandidate.name}
                  </h3>

                  <p>
                    <strong>Tahmini Maliyet:</strong>{" "}
                    {formatMoney(selectedCandidate.estimatedCost)}
                  </p>

                  <p>
                    <strong>Maliyet Skoru:</strong> {showScore(selectedCandidate.costScore)}
                  </p>

                  <p>
                    <strong>Talep Skoru:</strong> {showScore(selectedCandidate.demandScore)}
                  </p>

                  <p>
                    <strong>Genel Skor:</strong> {showScore(selectedCandidate.generalScore)}
                  </p>

                  {selectedCandidate.status === "missing" && (
                    <div className="popup-warning">Veri Eksik</div>
                  )}

                  <button
                    className="popup-save-button"
                    data-testid={`popup-save-candidate-button-${selectedCandidate.id}`}
                    onClick={() => saveCandidate(selectedCandidate)}
                  >
                    +
                  </button>
                </div>
              )}

              <div className="map-filter-overlay" data-testid="map-filter-overlay">
                <CandidateFilters filters={filters} setFilters={setFilters} onApply={applyFilters} />
              </div>
            </div>

            {message && (
              <div className="info-message" data-testid="candidate-page-message">
                {message}
              </div>
            )}
          </section>
        )}

        {activeTab === "personalization" && (
          <section
            className="standalone-panel personalization-screen"
            data-testid="personalization-screen"
          >
            <h1>Kisisellestirme</h1>

            <p className="page-description">
              Firma butcesi, sistem tipi, mekan turu ve bolgeye gore aday noktalar
              kisisellestirilir.
            </p>

            <PersonalizationForm
              candidates={candidates}
              regions={regions}
              onResult={handlePersonalizedResult}
              onRegionChange={handleRegionChange}
            />

            {selectedRegionSummary && (
              <div className="region-summary-card" data-testid="region-summary-card">
                <h2>Bolge Ozeti: {selectedRegionSummary.regionName}</h2>

                {regionSummaryMessage && (
                  <div className="info-message" data-testid="region-summary-message">
                    {regionSummaryMessage}
                  </div>
                )}

                <div className="region-summary-grid">
                  <div>
                    <strong>Toplam Istasyon</strong>
                    <span>{selectedRegionSummary.chargingStationCount}</span>
                  </div>

                  <div>
                    <strong>Trafik Yogunlugu</strong>
                    <span>{selectedRegionSummary.trafficLevel}</span>
                  </div>

                  <div>
                    <strong>En Yaygin Soket</strong>
                    <span>{selectedRegionSummary.mostCommonSocketType || "Veri Eksik"}</span>
                  </div>

                  <div>
                    <strong>En Yaygin Guc</strong>
                    <span>
                      {selectedRegionSummary.mostCommonPowerKw
                        ? `${selectedRegionSummary.mostCommonPowerKw} kW`
                        : "Veri Eksik"}
                    </span>
                  </div>
                </div>

                <h3>Firma Dagilimi</h3>

                <div className="company-distribution-list">
                  {(selectedRegionSummary.companyDistribution || []).map((company, index) => (
                    <div key={`${company.companyName}-${index}`}>
                      <span>{company.companyName}</span>
                      <strong>{company.stationCount} istasyon</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="section-title">Kisisellestirilmis Sonuclar</h2>

            <div className="personalized-card-grid" data-testid="personalized-candidate-list">
              {personalizedCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="personalized-candidate-card"
                  data-testid={`personalized-candidate-card-${candidate.id}`}
                >
                  <h3>{candidate.name}</h3>

                  <p>
                    <strong>Tahmini Adres:</strong> {candidate.estimatedAddress}
                  </p>

                  <p>
                    <strong>Bolge:</strong> {candidate.region}
                  </p>

                  <p>
                    <strong>Mahalle:</strong> {candidate.neighborhood}
                  </p>

                  <p>
                    <strong>Tahmini Kurulum Maliyeti:</strong>{" "}
                    {formatMoney(candidate.estimatedCost)}
                  </p>

                  <div className="score-row">
                    <span>Maliyet Skoru: {showScore(candidate.costScore)}</span>
                    <span>Talep Skoru: {showScore(candidate.demandScore)}</span>
                    <span>Genel Skor: {showScore(candidate.generalScore)}</span>
                  </div>

                  <p>
                    <strong>Sistem Tipi:</strong> {candidate.systemType}
                  </p>

                  <p>
                    <strong>Mekan Turu:</strong> {candidate.placeType}
                  </p>

                  {candidate.status === "missing" && (
                    <div className="warning-box">Veri Eksik</div>
                  )}

                  <button
                    data-testid={`show-on-map-button-${candidate.id}`}
                    onClick={() => showCandidateOnMap(candidate)}
                  >
                    Haritada Goster
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "saved" && (
          <section className="standalone-panel" data-testid="saved-screen">
            <SavedCandidates refreshKey={savedRefreshKey} />
          </section>
        )}
      </main>
    </div>
  );
}
