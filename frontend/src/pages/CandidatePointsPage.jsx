import React, {
  useEffect,
  useState,
} from "react";

import {
  Home,
  Zap,
  ListChecks,
  SlidersHorizontal,
} from "lucide-react";

import {
  getCandidatePoints,
} from "../services/candidatePointsApi";

import {
  saveCandidatePoint,
} from "../services/savedCandidatePointsApi";

import {
  getNeighborhoods,
  getRegions,
  getRegionSummary,
} from "../services/regionsApi";

import CandidateFilters from "../components/CandidateFilters";
import SavedCandidates from "../components/SavedCandidates";
import PersonalizationForm from "../components/PersonalizationForm";
import ExistingStationsMap from "../components/ExistingStationsMap";
import CandidatePointsMap from "../components/CandidatePointsMap";
import PoiSummary from "../components/PoiSummary";
import TrafoSummary from "../components/TrafoSummary";
import RoadSummary from "../components/RoadSummary";

const defaultFilters = {
  costMin: "",
  costMax: "",
  demandMin: "",
  demandMax: "",
  generalMin: "",
  generalMax: "",
};

const defaultDataFilter = {
  region: "Tümü",
  neighborhood: "Tümü",
  systemType: "Tümü",
  placeType: "Tümü",
  budgetMin: "",
  budgetMax: "",
};

function getNumberOrDefault(
  value,
  defaultValue
) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return defaultValue;
  }

  return Number(value);
}

function isScoreInRange(
  score,
  min,
  max
) {
  if (
    score === null ||
    score === undefined
  ) {
    return false;
  }

  return score >= min && score <= max;
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Veri Eksik";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Veri Eksik";
  }

  return `${numericValue.toLocaleString(
    "tr-TR"
  )} TL`;
}

function showScore(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Veri Eksik";
  }

  return value;
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

function getRegionId(region) {
  return (
    region?.id ??
    region?.Id ??
    region?.ID ??
    region?.regionId ??
    region?.RegionId ??
    null
  );
}

function getRegionName(region) {
  return (
    region?.name ??
    region?.Name ??
    region?.NAME ??
    region?.regionName ??
    region?.RegionName ??
    ""
  );
}

function getNeighborhoodName(
  neighborhood
) {
  return (
    neighborhood?.name ??
    neighborhood?.Name ??
    neighborhood?.NAME ??
    neighborhood?.neighborhoodName ??
    neighborhood?.NeighborhoodName ??
    ""
  );
}

function findBestNamedMatch(
  items,
  searchValue,
  nameSelector
) {
  const normalizedSearch =
    normalizeSearchText(searchValue);

  if (!normalizedSearch) {
    return null;
  }

  const searchableItems = items
    .map((item) => ({
      item,
      normalizedName:
        normalizeSearchText(
          nameSelector(item)
        ),
    }))
    .filter(
      ({ normalizedName }) =>
        normalizedName
    );

  const exactMatch =
    searchableItems.find(
      ({ normalizedName }) =>
        normalizedName ===
        normalizedSearch
    );

  if (exactMatch) {
    return exactMatch.item;
  }

  const startsWithMatch =
    searchableItems.find(
      ({ normalizedName }) =>
        normalizedName.startsWith(
          normalizedSearch
        )
    );

  if (startsWithMatch) {
    return startsWithMatch.item;
  }

  const includesMatch =
    searchableItems.find(
      ({ normalizedName }) =>
        normalizedName.includes(
          normalizedSearch
        )
    );

  return includesMatch?.item ?? null;
}

function candidateMatchesSearch(
  candidate,
  normalizedSearch
) {
  const searchableText = [
    candidate?.name,
    candidate?.estimatedAddress,
    candidate?.region,
    candidate?.regionName,
    candidate?.neighborhood,
    candidate?.neighborhoodName,
    candidate?.systemType,
    candidate?.placeType,
  ]
    .filter(Boolean)
    .map(normalizeSearchText)
    .join(" ");

  return searchableText.includes(
    normalizedSearch
  );
}

function candidateBelongsToRegion(
  candidate,
  region
) {
  const candidateRegionId =
    candidate?.regionId ??
    candidate?.RegionId ??
    null;

  const regionId =
    getRegionId(region);

  if (
    candidateRegionId !== null &&
    regionId !== null &&
    String(candidateRegionId) ===
      String(regionId)
  ) {
    return true;
  }

  const candidateRegionName =
    normalizeSearchText(
      candidate?.region ??
        candidate?.regionName
    );

  const regionName =
    normalizeSearchText(
      getRegionName(region)
    );

  return (
    candidateRegionName !== "" &&
    regionName !== "" &&
    candidateRegionName === regionName
  );
}

export default function CandidatePointsPage() {
  const [activeTab, setActiveTab] =
    useState("home");

  const [
    selectedCandidate,
    setSelectedCandidate,
  ] = useState(null);

  const [candidates, setCandidates] =
    useState([]);

  const [
    filteredCandidates,
    setFilteredCandidates,
  ] = useState([]);

  const [
    personalizedCandidates,
    setPersonalizedCandidates,
  ] = useState([]);

  const [regions, setRegions] =
    useState([]);

  const [
    neighborhoods,
    setNeighborhoods,
  ] = useState([]);

  const [
    selectedRegionSummary,
    setSelectedRegionSummary,
  ] = useState(null);

  const [
    regionSummaryMessage,
    setRegionSummaryMessage,
  ] = useState("");

  const [filters, setFilters] =
    useState(defaultFilters);

  const [
    selectedDataFilter,
    setSelectedDataFilter,
  ] = useState(defaultDataFilter);

  const [message, setMessage] =
    useState("");

  const [
    saveFeedback,
    setSaveFeedback,
  ] = useState("");

  const [
    savedRefreshKey,
    setSavedRefreshKey,
  ] = useState(0);

  const [
    stationSearch,
    setStationSearch,
  ] = useState("");

  const [
    candidateSearch,
    setCandidateSearch,
  ] = useState("");

  const [
    regionsActive,
    setRegionsActive,
  ] = useState(false);

  const [
    focusedRegionId,
    setFocusedRegionId,
  ] = useState(null);

  const [
    regionFocusKey,
    setRegionFocusKey,
  ] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCandidatePoints() {
      setMessage("Hesaplanıyor...");

      const result =
        await getCandidatePoints();

      if (!isMounted) {
        return;
      }

      const safeCandidates =
        Array.isArray(result.data)
          ? result.data
          : [];

      setCandidates(safeCandidates);

      setFilteredCandidates(
        safeCandidates
      );

      setPersonalizedCandidates(
        safeCandidates
      );

      setSelectedCandidate(null);
      setMessage("");
    }

    async function loadRegions() {
      const result =
        await getRegions();

      if (!isMounted) {
        return;
      }

      setRegions(
        Array.isArray(result.data)
          ? result.data
          : []
      );
    }

    async function loadNeighborhoods() {
      const result =
        await getNeighborhoods();

      if (!isMounted) {
        return;
      }

      setNeighborhoods(
        Array.isArray(result.data)
          ? result.data
          : []
      );
    }

    loadCandidatePoints();
    loadRegions();
    loadNeighborhoods();

    return () => {
      isMounted = false;
    };
  }, []);

  function validateFilters() {
    const values = Object.values(
      filters
    ).filter(
      (value) => value !== ""
    );

    for (const value of values) {
      const numberValue =
        Number(value);

      if (
        Number.isNaN(numberValue) ||
        numberValue < 0 ||
        numberValue > 100
      ) {
        setMessage(
          "Skor değerleri 0 ile 100 arasında olmalıdır."
        );

        return false;
      }
    }

    const costMin =
      getNumberOrDefault(
        filters.costMin,
        0
      );

    const costMax =
      getNumberOrDefault(
        filters.costMax,
        100
      );

    const demandMin =
      getNumberOrDefault(
        filters.demandMin,
        0
      );

    const demandMax =
      getNumberOrDefault(
        filters.demandMax,
        100
      );

    const generalMin =
      getNumberOrDefault(
        filters.generalMin,
        0
      );

    const generalMax =
      getNumberOrDefault(
        filters.generalMax,
        100
      );

    if (
      costMin > costMax ||
      demandMin > demandMax ||
      generalMin > generalMax
    ) {
      setMessage(
        "Minimum değer maksimum değerden büyük olamaz."
      );

      return false;
    }

    return true;
  }

  function applyFilters() {
    if (!validateFilters()) {
      return;
    }

    const costMin =
      getNumberOrDefault(
        filters.costMin,
        0
      );

    const costMax =
      getNumberOrDefault(
        filters.costMax,
        100
      );

    const demandMin =
      getNumberOrDefault(
        filters.demandMin,
        0
      );

    const demandMax =
      getNumberOrDefault(
        filters.demandMax,
        100
      );

    const generalMin =
      getNumberOrDefault(
        filters.generalMin,
        0
      );

    const generalMax =
      getNumberOrDefault(
        filters.generalMax,
        100
      );

    const result =
      candidates.filter(
        (candidate) =>
          isScoreInRange(
            candidate.costScore,
            costMin,
            costMax
          ) &&
          isScoreInRange(
            candidate.demandScore,
            demandMin,
            demandMax
          ) &&
          isScoreInRange(
            candidate.generalScore,
            generalMin,
            generalMax
          )
      );

    setFilteredCandidates(result);
    setSelectedCandidate(null);

    if (result.length === 0) {
      setMessage(
        "Belirtilen skor aralıklarında aday nokta bulunamadı."
      );
    } else {
      setMessage(
        `${result.length} aday nokta filtrelendi.`
      );
    }
  }

  async function saveCandidate(
    candidate
  ) {
    const result =
      await saveCandidatePoint(
        candidate
      );

    function showFeedback(
      feedbackMessage
    ) {
      setMessage(feedbackMessage);

      setSaveFeedback(
        feedbackMessage
      );

      window.setTimeout(() => {
        setSaveFeedback("");
      }, 2500);
    }

    if (
      result.status ===
      "already-saved"
    ) {
      showFeedback(
        "Bu aday nokta zaten kaydedilmiş."
      );

      return;
    }

    if (
      result.status ===
      "limit-exceeded"
    ) {
      showFeedback(
        "En fazla 10 aday nokta kaydedebilirsiniz."
      );

      return;
    }

    setSavedRefreshKey(
      (currentKey) =>
        currentKey + 1
    );

    if (result.source === "api") {
      showFeedback(
        "Aday nokta API üzerinden kaydedildi."
      );

      return;
    }

    if (
      result.source ===
      "api-and-local-storage"
    ) {
      showFeedback(
        "Aday nokta API ve lokal veriye kaydedildi."
      );

      return;
    }

    showFeedback(
      "Aday nokta lokal olarak kaydedildi."
    );
  }

  function handlePersonalizedResult(
    result
  ) {
    const safeResult =
      Array.isArray(result)
        ? result
        : [];

    setPersonalizedCandidates(
      safeResult
    );

    setFilteredCandidates(
      safeResult
    );

    setSelectedCandidate(null);
  }

  function handleSelectionChange(
    selection
  ) {
    setSelectedDataFilter({
      region:
        selection.region ||
        "Tümü",

      neighborhood:
        selection.neighborhood ||
        "Tümü",

      systemType:
        selection.systemType ||
        "Tümü",

      placeType:
        selection.placeType ||
        "Tümü",

      budgetMin:
        selection.budgetMin ||
        "",

      budgetMax:
        selection.budgetMax ||
        "",
    });
  }

  async function handleRegionChange(
    regionId
  ) {
    if (
      !regionId ||
      regionId === 0
    ) {
      setSelectedRegionSummary(null);
      setRegionSummaryMessage("");

      return;
    }

    const result =
      await getRegionSummary(
        regionId
      );

    setSelectedRegionSummary(
      result.data
    );

    if (result.source === "api") {
      setRegionSummaryMessage(
        "Bölge özeti API üzerinden getirildi."
      );

      return;
    }

    setRegionSummaryMessage("");
  }

  function showCandidateOnMap(
    candidate
  ) {
    setFilteredCandidates([
      candidate,
    ]);

    setSelectedCandidate(
      candidate
    );

    setFocusedRegionId(null);

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1
    );

    setCandidateSearch("");

    setActiveTab(
      "candidateMap"
    );
  }

  function openCandidateMap() {
    setFilteredCandidates(
      candidates
    );

    setSelectedCandidate(null);
    setFocusedRegionId(null);

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1
    );

    setCandidateSearch("");
    setMessage("");

    setActiveTab(
      "candidateMap"
    );
  }

  function resetCandidateSearch() {
    setFilteredCandidates(
      candidates
    );

    setSelectedCandidate(null);
    setFocusedRegionId(null);

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1
    );

    setMessage("");
  }

  function searchCandidates(
    searchValue
  ) {
    /*
     * Input değeri yalnızca kullanıcının yazdığı
     * metinden güncellenir. Bölge eşleşmesi input
     * değerini değiştirmez.
     */
    setCandidateSearch(
      searchValue
    );

    const normalizedSearch =
      normalizeSearchText(
        searchValue
      );

    if (!normalizedSearch) {
      resetCandidateSearch();
      return;
    }

    /*
     * Tek harfte otomatik bölge seçimi yapılmaz.
     * Kullanıcının özgürce yazabilmesi için en az
     * iki karakter beklenir.
     */
    if (normalizedSearch.length < 2) {
      setFilteredCandidates(
        candidates
      );

      setSelectedCandidate(null);
      setFocusedRegionId(null);

      setRegionFocusKey(
        (currentKey) =>
          currentKey + 1
      );

      setMessage("");

      return;
    }

    const candidateMatches =
      candidates.filter(
        (candidate) =>
          candidateMatchesSearch(
            candidate,
            normalizedSearch
          )
      );

    if (
      candidateMatches.length > 0
    ) {
      setFilteredCandidates(
        candidateMatches
      );

      setSelectedCandidate(
        candidateMatches[0]
      );

      setFocusedRegionId(null);

      setRegionFocusKey(
        (currentKey) =>
          currentKey + 1
      );

      setMessage(
        `${candidateMatches.length} aday nokta bulundu.`
      );

      return;
    }

    const selectableRegions =
      regions.filter(
        (region) =>
          Number(
            getRegionId(region)
          ) !== 0
      );

    let matchedRegion =
      findBestNamedMatch(
        selectableRegions,
        searchValue,
        getRegionName
      );

    const matchedNeighborhood =
      findBestNamedMatch(
        neighborhoods,
        searchValue,
        getNeighborhoodName
      );

    if (
      !matchedRegion &&
      matchedNeighborhood
    ) {
      const neighborhoodRegionId =
        matchedNeighborhood.regionId ??
        matchedNeighborhood.RegionId ??
        matchedNeighborhood.id ??
        matchedNeighborhood.Id;

      matchedRegion =
        selectableRegions.find(
          (region) =>
            String(
              getRegionId(region)
            ) ===
            String(
              neighborhoodRegionId
            )
        ) ??
        findBestNamedMatch(
          selectableRegions,

          matchedNeighborhood.regionName ??
            getNeighborhoodName(
              matchedNeighborhood
            ),

          getRegionName
        );
    }

    if (matchedRegion) {
      const regionId =
        getRegionId(
          matchedRegion
        );

      const regionCandidates =
        candidates.filter(
          (candidate) =>
            candidateBelongsToRegion(
              candidate,
              matchedRegion
            )
        );

      setRegionsActive(true);

      setFocusedRegionId(
        regionId
      );

      setRegionFocusKey(
        (currentKey) =>
          currentKey + 1
      );

      setFilteredCandidates(
        regionCandidates
      );

      setSelectedCandidate(null);

      setMessage(
        `${getRegionName(
          matchedRegion
        )} bölgesi bulundu.`
      );

      return;
    }

    setFilteredCandidates([]);
    setSelectedCandidate(null);
    setFocusedRegionId(null);

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1
    );

    setMessage(
      "Aramaya uygun aday nokta, bölge veya mahalle bulunamadı."
    );
  }

  function handleCandidateRegionSelect(
    region
  ) {
    if (!region) {
      return;
    }

    const regionName =
      getRegionName(region);

    const regionId =
      getRegionId(region);

    /*
     * Burada setCandidateSearch(regionName)
     * kullanılmıyor. Böylece haritadan veya
     * aramadan bölge seçildiğinde input içeriği
     * otomatik değiştirilmez.
     */
    setFocusedRegionId(
      regionId
    );

    setFilteredCandidates(
      candidates.filter(
        (candidate) =>
          candidateBelongsToRegion(
            candidate,
            region
          )
      )
    );

    setSelectedCandidate(null);

    setMessage(
      `${regionName || "Bölge"} seçildi.`
    );
  }

  function toggleCandidateRegions() {
    const nextValue =
      !regionsActive;

    setRegionsActive(
      nextValue
    );

    if (!nextValue) {
      setFocusedRegionId(null);
      setSelectedCandidate(null);

      setRegionFocusKey(
        (currentKey) =>
          currentKey + 1
      );

      return;
    }

    if (
      candidateSearch.trim()
    ) {
      searchCandidates(
        candidateSearch
      );
    }
  }

  return (
    <div
      className="candidate-page"
      data-testid="candidate-points-page"
    >
      <aside
        className="left-menu"
        data-testid="left-menu"
      >
        <button
          type="button"
          className={
            activeTab === "home"
              ? "menu-button active"
              : "menu-button"
          }
          data-testid="home-tab-button"
          onClick={() =>
            setActiveTab("home")
          }
          title="Mevcut istasyon haritası"
        >
          <Home
            size={26}
            strokeWidth={2.3}
          />
        </button>

        <button
          type="button"
          className={
            activeTab ===
            "candidateMap"
              ? "menu-button active"
              : "menu-button"
          }
          data-testid="candidate-map-tab-button"
          onClick={openCandidateMap}
          title="Aday nokta haritası"
        >
          <Zap
            size={26}
            strokeWidth={2.3}
          />
        </button>

        <button
          type="button"
          className={
            activeTab === "saved"
              ? "menu-button active"
              : "menu-button"
          }
          data-testid="saved-tab-button"
          onClick={() =>
            setActiveTab("saved")
          }
          title="Kaydedilenler"
        >
          <ListChecks
            size={26}
            strokeWidth={2.3}
          />
        </button>

        <button
          type="button"
          className={
            activeTab ===
            "personalization"
              ? "menu-button active"
              : "menu-button"
          }
          data-testid="personalization-tab-button"
          onClick={() =>
            setActiveTab(
              "personalization"
            )
          }
          title="Kişiselleştirme"
        >
          <SlidersHorizontal
            size={26}
            strokeWidth={2.3}
          />
        </button>
      </aside>

      {saveFeedback && (
        <div
          className="save-feedback-toast"
          data-testid="save-feedback-toast"
        >
          {saveFeedback}
        </div>
      )}

      <main className="page-content">
        {activeTab === "home" && (
          <section
            className="map-screen"
            data-testid="home-map-screen"
          >
            <div className="map-topbar">
              <input
                className="map-search"
                data-testid="home-search-input"
                placeholder="Adres veya mahalle ara"
                value={stationSearch}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) =>
                  setStationSearch(
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                className={
                  regionsActive
                    ? "region-toggle active"
                    : "region-toggle"
                }
                data-testid="home-region-toggle-button"
                onClick={() =>
                  setRegionsActive(
                    (
                      currentValue
                    ) =>
                      !currentValue
                  )
                }
              >
                {regionsActive
                  ? "Bölgeler aktif"
                  : "Bölgeler inaktif"}
              </button>
            </div>

            <div className="mock-map">
              <ExistingStationsMap
                searchTerm={
                  stationSearch
                }
                mapStep={
                  regionsActive
                    ? 2
                    : 1
                }
              />
            </div>
          </section>
        )}

        {activeTab ===
          "candidateMap" && (
          <section
            className="map-screen"
            data-testid="candidate-map-screen"
          >
            <div className="map-topbar">
              <input
                className="map-search"
                data-testid="candidate-search-input"
                placeholder="Aday nokta, bölge veya mahalle ara"
                value={candidateSearch}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) =>
                  searchCandidates(
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                className={
                  regionsActive
                    ? "region-toggle active"
                    : "region-toggle"
                }
                data-testid="candidate-region-toggle-button"
                onClick={
                  toggleCandidateRegions
                }
              >
                {regionsActive
                  ? "Bölgeler aktif"
                  : "Bölgeler inaktif"}
              </button>
            </div>

            <div className="mock-map candidate-map">
              <CandidatePointsMap
                points={
                  filteredCandidates
                }
                regions={regions}
                regionsActive={
                  regionsActive
                }
                selectedPointId={
                  selectedCandidate?.id ??
                  null
                }
                focusedRegionId={
                  focusedRegionId
                }
                regionFocusKey={
                  regionFocusKey
                }
                onPointSelect={
                  setSelectedCandidate
                }
                onRegionSelect={
                  handleCandidateRegionSelect
                }
              />

              {selectedCandidate && (
                <div
                  className="map-candidate-popup"
                  data-testid={`map-candidate-popup-${selectedCandidate.id}`}
                >
                  <button
                    className="popup-close-button"
                    data-testid="candidate-popup-close-button"
                    onClick={() =>
                      setSelectedCandidate(
                        null
                      )
                    }
                    type="button"
                  >
                    ×
                  </button>

                  <small>
                    {
                      selectedCandidate.estimatedAddress
                    }
                  </small>

                  <h3
                    data-testid={`popup-candidate-name-${selectedCandidate.id}`}
                  >
                    {
                      selectedCandidate.name
                    }
                  </h3>

                  <p>
                    <strong>
                      Tahmini Maliyet:
                    </strong>

                    <span>
                      {formatMoney(
                        selectedCandidate.estimatedCost
                      )}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Maliyet Skoru:
                    </strong>

                    <span>
                      {showScore(
                        selectedCandidate.costScore
                      )}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Talep Skoru:
                    </strong>

                    <span>
                      {showScore(
                        selectedCandidate.demandScore
                      )}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Genel Skor:
                    </strong>

                    <span>
                      {showScore(
                        selectedCandidate.generalScore
                      )}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Koordinat:
                    </strong>

                    <span>
                      {selectedCandidate.latitude &&
                      selectedCandidate.longitude
                        ? `${selectedCandidate.latitude}, ${selectedCandidate.longitude}`
                        : "Veri Eksik"}
                    </span>
                  </p>

                  {selectedCandidate.status ===
                    "calculating" && (
                    <div className="popup-warning">
                      Hesaplanıyor
                    </div>
                  )}

                  {selectedCandidate.status ===
                    "missing" && (
                    <div className="popup-warning">
                      Veri Eksik
                    </div>
                  )}

                  <button
                    type="button"
                    className="popup-save-button"
                    data-testid={`popup-save-candidate-button-${selectedCandidate.id}`}
                    onClick={() =>
                      saveCandidate(
                        selectedCandidate
                      )
                    }
                    title="Aday noktayı kaydet"
                  >
                    <span className="popup-save-icon">
                      +
                    </span>

                    <span className="popup-save-text">
                      Kaydet
                    </span>
                  </button>
                </div>
              )}

              <div
                className="map-filter-overlay"
                data-testid="map-filter-overlay"
              >
                <CandidateFilters
                  filters={filters}
                  setFilters={
                    setFilters
                  }
                  onApply={
                    applyFilters
                  }
                />
              </div>
            </div>

            {message && (
              <div
                className="info-message"
                data-testid="candidate-page-message"
              >
                {message}
              </div>
            )}
          </section>
        )}

        {activeTab ===
          "personalization" && (
          <section
            className="standalone-panel personalization-screen"
            data-testid="personalization-screen"
          >
            <h1>
              Kişiselleştirme
            </h1>

            <p className="page-description">
              Firma bütçesi, sistem tipi,
              mekân türü ve bölgeye göre
              aday noktalar
              kişiselleştirilir.
            </p>

            <PersonalizationForm
              candidates={
                candidates
              }
              regions={regions}
              neighborhoods={
                neighborhoods
              }
              onResult={
                handlePersonalizedResult
              }
              onRegionChange={
                handleRegionChange
              }
              onSelectionChange={
                handleSelectionChange
              }
            />

            <section
              className="data-layers-section"
              data-testid="data-layers-section"
            >
              <div className="data-layers-header">
                <h2>
                  Veri Katmanları Özeti
                </h2>

                <p>
                  Aday nokta analizi için
                  kullanılan temel CBS
                  katmanları aşağıda
                  özetlenmiştir.
                </p>

                <div
                  className="selected-data-filter"
                  data-testid="selected-data-filter"
                >
                  <span>
                    <strong>
                      Seçilen Bölge:
                    </strong>{" "}
                    {
                      selectedDataFilter.region
                    }
                  </span>

                  <span>
                    <strong>
                      Seçilen Mahalle:
                    </strong>{" "}
                    {
                      selectedDataFilter.neighborhood
                    }
                  </span>

                  <span>
                    <strong>
                      Sistem Tipi:
                    </strong>{" "}
                    {
                      selectedDataFilter.systemType
                    }
                  </span>

                  <span>
                    <strong>
                      Mekân Türü:
                    </strong>{" "}
                    {
                      selectedDataFilter.placeType
                    }
                  </span>
                </div>
              </div>

              <PoiSummary />
              <TrafoSummary />
              <RoadSummary />
            </section>

            {selectedRegionSummary && (
              <div
                className="region-summary-card"
                data-testid="region-summary-card"
              >
                <h2>
                  Bölge Özeti:{" "}
                  {
                    selectedRegionSummary.regionName
                  }
                </h2>

                {regionSummaryMessage && (
                  <div
                    className="info-message"
                    data-testid="region-summary-message"
                  >
                    {
                      regionSummaryMessage
                    }
                  </div>
                )}

                <div className="region-summary-grid">
                  <div>
                    <strong>
                      Toplam İstasyon
                    </strong>

                    <span>
                      {
                        selectedRegionSummary.chargingStationCount
                      }
                    </span>
                  </div>

                  <div>
                    <strong>
                      Trafik Yoğunluğu
                    </strong>

                    <span>
                      {
                        selectedRegionSummary.trafficLevel
                      }
                    </span>
                  </div>

                  <div>
                    <strong>
                      En Yaygın Soket
                    </strong>

                    <span>
                      {selectedRegionSummary.mostCommonSocketType ||
                        "Veri Eksik"}
                    </span>
                  </div>

                  <div>
                    <strong>
                      En Yaygın Güç
                    </strong>

                    <span>
                      {selectedRegionSummary.mostCommonPowerKw
                        ? `${selectedRegionSummary.mostCommonPowerKw} kW`
                        : "Veri Eksik"}
                    </span>
                  </div>
                </div>

                <h3>
                  Firma Dağılımı
                </h3>

                <div className="company-distribution-list">
                  {(
                    selectedRegionSummary.companyDistribution ||
                    []
                  ).map(
                    (
                      company,
                      index
                    ) => (
                      <div
                        key={`${company.companyName}-${index}`}
                      >
                        <span>
                          {
                            company.companyName
                          }
                        </span>

                        <strong>
                          {
                            company.stationCount
                          }{" "}
                          istasyon
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <h2 className="section-title">
              Kişiselleştirilmiş
              Sonuçlar
            </h2>

            <div
              className="personalized-card-grid"
              data-testid="personalized-candidate-list"
            >
              {personalizedCandidates.map(
                (candidate) => (
                  <div
                    key={
                      candidate.id
                    }
                    className="personalized-candidate-card"
                    data-testid={`personalized-candidate-card-${candidate.id}`}
                  >
                    <h3>
                      {candidate.name}
                    </h3>

                    <p>
                      <strong>
                        Tahmini Adres:
                      </strong>{" "}
                      {
                        candidate.estimatedAddress
                      }
                    </p>

                    <p>
                      <strong>
                        Bölge:
                      </strong>{" "}
                      {candidate.region}
                    </p>

                    <p>
                      <strong>
                        Mahalle:
                      </strong>{" "}
                      {
                        candidate.neighborhood
                      }
                    </p>

                    <p>
                      <strong>
                        Tahmini Kurulum
                        Maliyeti:
                      </strong>{" "}
                      {formatMoney(
                        candidate.estimatedCost
                      )}
                    </p>

                    <div className="score-row">
                      <span>
                        Maliyet Skoru:{" "}
                        {showScore(
                          candidate.costScore
                        )}
                      </span>

                      <span>
                        Talep Skoru:{" "}
                        {showScore(
                          candidate.demandScore
                        )}
                      </span>

                      <span>
                        Genel Skor:{" "}
                        {showScore(
                          candidate.generalScore
                        )}
                      </span>
                    </div>

                    <p>
                      <strong>
                        Sistem Tipi:
                      </strong>{" "}
                      {
                        candidate.systemType
                      }
                    </p>

                    <p>
                      <strong>
                        Mekân Türü:
                      </strong>{" "}
                      {
                        candidate.placeType
                      }
                    </p>

                    {candidate.status ===
                      "calculating" && (
                      <div className="warning-box">
                        Hesaplanıyor
                      </div>
                    )}

                    {candidate.status ===
                      "missing" && (
                      <div className="warning-box">
                        Veri Eksik
                      </div>
                    )}

                    <button
                      type="button"
                      data-testid={`show-on-map-button-${candidate.id}`}
                      onClick={() =>
                        showCandidateOnMap(
                          candidate
                        )
                      }
                    >
                      Haritada Göster
                    </button>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {activeTab === "saved" && (
          <section
            className="standalone-panel"
            data-testid="saved-screen"
          >
            <SavedCandidates
              refreshKey={
                savedRefreshKey
              }
            />
          </section>
        )}
      </main>
    </div>
  );
}