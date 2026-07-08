import React, { useEffect, useState } from "react";
import CandidateFilters from "../components/CandidateFilters";
import SavedCandidates from "../components/SavedCandidates";
import PersonalizationForm from "../components/PersonalizationForm";
import ExistingStationsMap from "../components/ExistingStationsMap";
import { getCandidatePoints } from "../services/candidatePointsApi";

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
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [personalizedCandidates, setPersonalizedCandidates] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [message, setMessage] = useState("");
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [stationSearch, setStationSearch] = useState("");
  const [regionsActive, setRegionsActive] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCandidatePoints() {
      setMessage("Hesaplaniyor...");

      const result = await getCandidatePoints();

      if (!isMounted) {
        return;
      }

      setCandidates(result.data);
      setFilteredCandidates(result.data);

      if (result.source === "local-mock") {
        setMessage("Backend erisilemedi. Lokal mock veri gosteriliyor.");
        return;
      }

      setMessage("");
    }

    loadCandidatePoints();

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
    if (!validateFilters()) {
      return;
    }

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

    if (result.length === 0) {
      setMessage("Uygun aday nokta bulunamadi.");
    } else {
      setMessage("Filtreleme uygulandi.");
    }
  }

  function saveCandidate(candidate) {
    const savedCandidates = JSON.parse(localStorage.getItem("savedCandidates")) || [];
    const alreadySaved = savedCandidates.some((item) => item.id === candidate.id);

    if (alreadySaved) {
      setMessage("Bu aday nokta zaten kaydedilmis.");
      return;
    }

    if (savedCandidates.length >= 10) {
      setMessage("En fazla 10 aday nokta kaydedebilirsiniz.");
      return;
    }

    const updatedSavedCandidates = [...savedCandidates, candidate];

    localStorage.setItem("savedCandidates", JSON.stringify(updatedSavedCandidates));

    setSavedRefreshKey(savedRefreshKey + 1);
    setMessage("Aday nokta kaydedildi.");
  }

  function handlePersonalizedResult(result) {
    setPersonalizedCandidates(result);
    setFilteredCandidates(result);
    setSelectedCandidate(result[0] || null);
  }

  function showCandidateOnMap(candidate) {
    setActiveTab("candidateMap");
    setSelectedCandidate(candidate);
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
          🏠
        </button>

        <button
          className={activeTab === "candidateMap" ? "menu-button active" : "menu-button"}
          data-testid="candidate-map-tab-button"
          onClick={() => setActiveTab("candidateMap")}
          title="Aday nokta haritasi"
        >
          ⚡
        </button>

        <button
          className={activeTab === "saved" ? "menu-button active" : "menu-button"}
          data-testid="saved-tab-button"
          onClick={() => setActiveTab("saved")}
          title="Kaydedilenler"
        >
          ☰
        </button>

        <button
          className={activeTab === "personalization" ? "menu-button active" : "menu-button"}
          data-testid="personalization-tab-button"
          onClick={() => setActiveTab("personalization")}
          title="Kisisellestirme"
        >
          🖌
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

              <button
                type="button"
                className={regionsActive ? "region-toggle active" : "region-toggle"}
                onClick={() => setRegionsActive((currentValue) => !currentValue)}
              >
                {regionsActive ? "Bolgeler aktif" : "Bolgeler inaktif"}
              </button>
            </div>

            <div className="mock-map">
              <ExistingStationsMap searchTerm={stationSearch} regionsActive={regionsActive} />
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
          <section className="standalone-panel" data-testid="personalization-screen">
            <h1>Kisisellestirme</h1>

            <p className="page-description">
              Firma butcesi, sistem tipi, mekan turu ve bolgeye gore aday noktalar
              kisisellestirilir. Sonuclardan "Haritada Gor" secilerek aday nokta
              haritasina gidilir.
            </p>

            <PersonalizationForm candidates={candidates} onResult={handlePersonalizedResult} />

            <h2 className="section-title">Kisisellestirilmis Sonuclar</h2>

            <div className="personalized-result-list" data-testid="personalized-candidate-list">
              {personalizedCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="personalized-result-card"
                  data-testid={`personalized-candidate-card-${candidate.id}`}
                >
                  <div>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.estimatedAddress}</p>
                    <p>
                      <strong>Genel Skor:</strong> {showScore(candidate.generalScore)}
                    </p>
                  </div>

                  <button
                    data-testid={`show-on-map-button-${candidate.id}`}
                    onClick={() => showCandidateOnMap(candidate)}
                  >
                    Haritada Gor
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
