import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  ChevronDown,
  Home,
  Zap,
  ListChecks,
  SlidersHorizontal,
  LayoutDashboard,
  Power,
} from "lucide-react";

import {
  getCandidatePoints,
  scanCandidatePointsByRegion,
} from "../services/candidatePointsApi";

import {
  evaluateManualPin,
  locateRegionPoint,
} from "../services/manualPinApi";

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
import AlternativeCandidatesModal from "../components/AlternativeCandidatesModal";
import PoiSummary from "../components/PoiSummary";
import TrafoSummary from "../components/TrafoSummary";
import RoadSummary from "../components/RoadSummary";

import { useAuth } from "../context/AuthContext";

import {
  mapCandidatePoint,
} from "../utils/candidatePointMapper";

import "./CandidateSearch.css";
import "./CandidateScan.css";
import "./PersonalizationLayout.css";

const REGION_SCAN_MIN_GENERAL_SCORE =
  80;

const defaultFilters = {
  costMin: "",
  costMax: "",
  demandMin: "",
  demandMax: "",
  generalMin: "",
  generalMax: "",
};

const defaultDataFilter = {
  regionId: "0",
  region: "Tümü",

  neighborhoodId: "0",
  neighborhood: "Tümü",

  systemType: "Tümü",
  placeType: "Tümü",

  budgetMin: "",
  budgetMax: "",
};

function normalizeLocationKey(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(mahallesi|mahalle|mah|mh)$/g, "");
}

function getLocationId(item) {
  const value =
    item?.id ??
    item?.Id ??
    item?.ID ??
    item?.regionId ??
    item?.RegionId ??
    item?.neighborhoodId ??
    item?.NeighborhoodId;

  const numericValue = Number(value);

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

function getLocationName(item) {
  return String(
    item?.name ??
      item?.Name ??
      item?.NAME ??
      item?.regionName ??
      item?.RegionName ??
      item?.neighborhoodName ??
      item?.NeighborhoodName ??
      "",
  ).trim();
}

function findSelectedLocation(items, selectedId, selectedName) {
  const safeItems = Array.isArray(items) ? items : [];
  const numericSelectedId = Number(selectedId);

  if (Number.isInteger(numericSelectedId) && numericSelectedId > 0) {
    const idMatch = safeItems.find(
      (item) => getLocationId(item) === numericSelectedId,
    );

    if (idMatch) {
      return idMatch;
    }
  }

  const selectedNameKey = normalizeLocationKey(selectedName);

  if (!selectedNameKey) {
    return null;
  }

  return (
    safeItems.find(
      (item) => normalizeLocationKey(getLocationName(item)) === selectedNameKey,
    ) ?? null
  );
}

function getNumberOrDefault(
  value,
  defaultValue,
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
  max,
) {
  if (
    score === null ||
    score === undefined
  ) {
    return false;
  }

  return (
    Number(score) >= min &&
    Number(score) <= max
  );
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Veri Eksik";
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return "Veri Eksik";
  }

  return `${numericValue.toLocaleString(
    "tr-TR",
  )} TL`;
}

function showScore(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Veri Eksik";
  }

  return value;
}

function hasCompleteCandidateAnalysis(
  candidate,
) {
  if (!candidate) {
    return false;
  }

  const requiredValues = [
    candidate.estimatedCost,
    candidate.costScore,
    candidate.demandScore,
    candidate.generalScore,
  ];

  const hasAllNumericValues =
    requiredValues.every(
      (value) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(
          Number(value),
        ),
    );

  return (
    hasAllNumericValues &&
    candidate.status !==
      "calculating" &&
    candidate.status !== "missing"
  );
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/ı/g, "i")
    .replace(
      /[^a-z0-9]/g,
      "",
    );
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

function candidateMatchesSearch(
  candidate,
  normalizedSearch,
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
    normalizedSearch,
  );
}

function getSearchMatchScore(
  value,
  normalizedSearch,
) {
  const normalizedValue =
    normalizeSearchText(value);

  if (
    !normalizedValue ||
    !normalizedSearch
  ) {
    return Number.POSITIVE_INFINITY;
  }

  if (
    normalizedValue ===
    normalizedSearch
  ) {
    return 0;
  }

  if (
    normalizedValue.startsWith(
      normalizedSearch,
    )
  ) {
    return 1;
  }

  if (
    normalizedValue.includes(
      normalizedSearch,
    )
  ) {
    return 2;
  }

  return Number.POSITIVE_INFINITY;
}

function createSearchTestIdPart(value) {
  return String(
    value ?? "unknown",
  )
    .trim()
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "-",
    );
}

function mergeCandidateLists(
  currentCandidates,
  incomingCandidates,
) {
  const mergedCandidates =
    new Map();

  [
    ...(Array.isArray(
      currentCandidates,
    )
      ? currentCandidates
      : []),

    ...(Array.isArray(
      incomingCandidates,
    )
      ? incomingCandidates
      : []),
  ].forEach((candidate) => {
    if (
      candidate?.id === null ||
      candidate?.id === undefined
    ) {
      return;
    }

    mergedCandidates.set(
      String(candidate.id),
      candidate,
    );
  });

  return Array.from(
    mergedCandidates.values(),
  );
}

function createManualCandidate(
  evaluation,
  locateResult,
  preferences = {},
) {
  const regionName =
    evaluation.regionName ||
    locateResult.regionName ||
    "Bölge";

  const neighborhoodName =
    evaluation.neighborhoodName ||
    locateResult.neighborhoodName ||
    null;

  const estimatedAddress = [
    neighborhoodName,
    regionName,
    "Çankaya",
    "Ankara",
  ]
    .filter(Boolean)
    .join(" / ");

  const mappedCandidate =
    mapCandidatePoint(
      {
        id:
          `manual-${Date.now()}`,

        name:
          neighborhoodName
            ? `Manuel Aday - ${neighborhoodName}`
            : `Manuel Aday - ${regionName}`,

        estimatedAddress,

        regionId:
          evaluation.regionId ??
          locateResult.regionId,

        regionName,
        region: regionName,

        neighborhoodId:
          evaluation.neighborhoodId ??
          locateResult.neighborhoodId,

        neighborhoodName,

        neighborhood:
          neighborhoodName,

        estimatedCost:
          evaluation.estimatedCost,

        costScore:
          evaluation.costScore,

        demandScore:
          evaluation.demandScore,

        generalScore:
          evaluation.generalScore,

        latitude:
          evaluation.latitude,

        longitude:
          evaluation.longitude,

        systemType:
          evaluation.systemType ||
          preferences.systemType ||
          "",

        placeType:
          evaluation.placeType ||
          preferences.placeType ||
          "",

        powerKw:
          preferences.powerKw ??
          null,

        connectorCount:
          preferences.connectorCount ??
          null,

        budget:
          preferences.budget ??
          null,

        isManual: true,

        status:
          evaluation.status ||
          "missing",
      },
      0,
    );

  return {
    ...mappedCandidate,

    isManual: true,

    powerKw:
      preferences.powerKw ??
      mappedCandidate?.powerKw ??
      null,

    connectorCount:
      preferences.connectorCount ??
      mappedCandidate?.connectorCount ??
      null,

    budget:
      preferences.budget ??
      mappedCandidate?.budget ??
      null,

    costSource:
      evaluation.costSource ||
      "",

    manualMessage:
      evaluation.message ||
      "",

    status:
      evaluation.status ||
      mappedCandidate?.status ||
      "missing",
  };
}

export default function CandidatePointsPage() {
  const {
    user,
    isAdmin,
    logoutUser,
  } = useAuth();

  const canOpenAdminPanel = true;

  const scanRequestIdRef =
    useRef(0);

  const manualPinRequestIdRef =
    useRef(0);

  const [
    activeTab,
    setActiveTab,
  ] = useState("home");

  const [
    dataLayersOpen,
    setDataLayersOpen,
  ] = useState(false);

  const [
    selectedCandidate,
    setSelectedCandidate,
  ] = useState(null);

  const [
    alternativeModalOpen,
    setAlternativeModalOpen,
  ] = useState(false);

  const [
    manualPinCandidate,
    setManualPinCandidate,
  ] = useState(null);

  const [
    manualPinStatus,
    setManualPinStatus,
  ] = useState("idle");

  const [
    manualPinMessage,
    setManualPinMessage,
  ] = useState("");

  const [
    manualPinError,
    setManualPinError,
  ] = useState("");

  const [
    candidates,
    setCandidates,
  ] = useState([]);

  const [
    filteredCandidates,
    setFilteredCandidates,
  ] = useState([]);

  const [
    scannedCandidates,
    setScannedCandidates,
  ] = useState([]);

  const [
    selectedScanRegion,
    setSelectedScanRegion,
  ] = useState(null);

  const [
    scanStatus,
    setScanStatus,
  ] = useState("idle");

  const [
    scanMessage,
    setScanMessage,
  ] = useState("");

  const [
    scanError,
    setScanError,
  ] = useState("");

  const [
    scanResultCount,
    setScanResultCount,
  ] = useState(0);

  const [
    personalizedCandidates,
    setPersonalizedCandidates,
  ] = useState([]);

  const [
    regions,
    setRegions,
  ] = useState([]);

  const [
    neighborhoods,
    setNeighborhoods,
  ] = useState([]);


  const [
    summaryNeighborhoods,
    setSummaryNeighborhoods,
  ] = useState([]);

  const [
    summaryBoundaryLoading,
    setSummaryBoundaryLoading,
  ] = useState(false);

  const [
    selectedRegionSummary,
    setSelectedRegionSummary,
  ] = useState(null);

  const [
    regionSummaryMessage,
    setRegionSummaryMessage,
  ] = useState("");

  const [
    filters,
    setFilters,
  ] = useState(defaultFilters);

  const [
    selectedDataFilter,
    setSelectedDataFilter,
  ] = useState(
    defaultDataFilter,
  );

  const [
    message,
    setMessage,
  ] = useState("");

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
    homeSearchSuggestions,
    setHomeSearchSuggestions,
  ] = useState([]);

  const [
    homeSearchOpen,
    setHomeSearchOpen,
  ] = useState(false);

  const [
    activeHomeSearchIndex,
    setActiveHomeSearchIndex,
  ] = useState(-1);

  const [
    selectedHomeSearchResult,
    setSelectedHomeSearchResult,
  ] = useState(null);

  const [
    homeSearchSelectionKey,
    setHomeSearchSelectionKey,
  ] = useState(0);

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

  const [
    candidateFocusKey,
    setCandidateFocusKey,
  ] = useState(0);

  const [
    candidateSearchOpen,
    setCandidateSearchOpen,
  ] = useState(false);

  const [
    activeSearchSuggestionIndex,
    setActiveSearchSuggestionIndex,
  ] = useState(-1);

  const candidateSearchSuggestions =
    useMemo(() => {
      const normalizedSearch =
        normalizeSearchText(
          candidateSearch,
        );

      if (
        normalizedSearch.length < 2
      ) {
        return [];
      }

      const candidateSuggestions =
        candidates
          .map((candidate) => {
            const candidateName =
              candidate?.name ||
              "Aday Nokta";

            let score =
              getSearchMatchScore(
                candidateName,
                normalizedSearch,
              );

            if (
              !Number.isFinite(
                score,
              ) &&
              candidateMatchesSearch(
                candidate,
                normalizedSearch,
              )
            ) {
              score = 3;
            }

            return {
              key:
                `candidate-${candidate.id}`,

              id:
                candidate.id,

              type:
                "candidate",

              typeLabel:
                "Aday Nokta",

              label:
                candidateName,

              description:
                candidate.estimatedAddress ||
                candidate.region ||
                "Adres bilgisi yok",

              score,
              value:
                candidate,
            };
          })
          .filter(
            (suggestion) =>
              Number.isFinite(
                suggestion.score,
              ),
          );

      const usedRegionIds =
        new Set();

      const regionSuggestions =
        regions
          .filter((region) => {
            const regionId =
              getRegionId(region);

            return (
              regionId !== null &&
              regionId !== undefined &&
              Number(regionId) !== 0
            );
          })
          .map((region) => {
            const regionId =
              getRegionId(region);

            const regionName =
              getRegionName(region);

            return {
              key:
                `region-${regionId}`,

              id:
                regionId,

              type:
                "region",

              typeLabel:
                "Mahalle",

              label:
                regionName,

              description:
                "Mahalle sınırını haritada göster",

              score:
                getSearchMatchScore(
                  regionName,
                  normalizedSearch,
                ),

              value:
                region,
            };
          })
          .filter((suggestion) => {
            if (
              !Number.isFinite(
                suggestion.score,
              )
            ) {
              return false;
            }

            const regionKey =
              String(
                suggestion.id,
              );

            if (
              usedRegionIds.has(
                regionKey,
              )
            ) {
              return false;
            }

            usedRegionIds.add(
              regionKey,
            );

            return true;
          });

      return [
        ...candidateSuggestions,
        ...regionSuggestions,
      ]
        .sort(
          (
            first,
            second,
          ) => {
            if (
              first.score !==
              second.score
            ) {
              return (
                first.score -
                second.score
              );
            }

            return first.label.localeCompare(
              second.label,
              "tr-TR",
            );
          },
        )
        .slice(0, 8);
    }, [
      candidateSearch,
      candidates,
      regions,
    ]);

  const summarySpatialFilter = useMemo(() => {
    const selectedRegion = findSelectedLocation(
      regions,
      selectedDataFilter.regionId,
      selectedDataFilter.region,
    );

    const selectedNeighborhood = findSelectedLocation(
      summaryNeighborhoods,
      selectedDataFilter.neighborhoodId,
      selectedDataFilter.neighborhood,
    );

    const neighborhoodRequested =
      Number(selectedDataFilter.neighborhoodId) > 0 ||
      normalizeLocationKey(selectedDataFilter.neighborhood) !==
        normalizeLocationKey("Tümü");

    if (neighborhoodRequested) {
      return {
        level: "neighborhood",
        label: selectedDataFilter.neighborhood || "Seçili mahalle",
        boundaryGeoJson: selectedNeighborhood?.boundaryGeoJson || "",
        loading: summaryBoundaryLoading,
      };
    }

    const regionRequested =
      Number(selectedDataFilter.regionId) > 0 ||
      normalizeLocationKey(selectedDataFilter.region) !==
        normalizeLocationKey("Tümü");

    if (regionRequested) {
      return {
        level: "region",
        label: selectedDataFilter.region || "Seçili bölge",
        boundaryGeoJson: selectedRegion?.boundaryGeoJson || "",
        loading: false,
      };
    }

    return {
      level: "all",
      label: "Tümü",
      boundaryGeoJson: "",
      loading: false,
    };
  }, [
    regions,
    selectedDataFilter.neighborhood,
    selectedDataFilter.neighborhoodId,
    selectedDataFilter.region,
    selectedDataFilter.regionId,
    summaryBoundaryLoading,
    summaryNeighborhoods,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function loadCandidatePoints() {
      setMessage(
        "Hesaplanıyor...",
      );

      const result =
        await getCandidatePoints();

      if (!isMounted) {
        return;
      }

      const safeCandidates =
        Array.isArray(
          result.data,
        )
          ? result.data
          : [];

      setCandidates(
        safeCandidates,
      );

      setFilteredCandidates([]);

      setPersonalizedCandidates(
        safeCandidates,
      );

      setSelectedCandidate(
        null,
      );

      setMessage("");
    }

    async function loadRegions() {
      const result =
        await getRegions();

      if (!isMounted) {
        return;
      }

      setRegions(
        Array.isArray(
          result.data,
        )
          ? result.data
          : [],
      );
    }

    async function loadNeighborhoods() {
      const result =
        await getNeighborhoods();

      if (!isMounted) {
        return;
      }

      setNeighborhoods(
        Array.isArray(
          result.data,
        )
          ? result.data
          : [],
      );
    }

    loadCandidatePoints();
    loadRegions();
    loadNeighborhoods();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const selectedRegion = findSelectedLocation(
      regions,
      selectedDataFilter.regionId,
      selectedDataFilter.region,
    );

    const numericRegionId =
      getLocationId(selectedRegion) ?? Number(selectedDataFilter.regionId);

    const neighborhoodRequested =
      Number(selectedDataFilter.neighborhoodId) > 0 ||
      normalizeLocationKey(selectedDataFilter.neighborhood) !==
        normalizeLocationKey("Tümü");

    if (
      !Number.isInteger(numericRegionId) ||
      numericRegionId <= 0 ||
      !neighborhoodRequested
    ) {
      setSummaryNeighborhoods([]);
      setSummaryBoundaryLoading(false);

      return () => {
        isMounted = false;
      };
    }

    setSummaryBoundaryLoading(true);

    getNeighborhoods(
      numericRegionId,
      selectedDataFilter.region,
    )
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setSummaryNeighborhoods(
          Array.isArray(result.data) ? result.data : [],
        );
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setSummaryNeighborhoods([]);
      })
      .finally(() => {
        if (isMounted) {
          setSummaryBoundaryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    regions,
    selectedDataFilter.neighborhood,
    selectedDataFilter.neighborhoodId,
    selectedDataFilter.region,
    selectedDataFilter.regionId,
  ]);

  useEffect(() => {
    if (!selectedCandidate) {
      setAlternativeModalOpen(
        false,
      );
    }
  }, [selectedCandidate]);

  function validateFilters() {
    const values =
      Object.values(
        filters,
      ).filter(
        (value) =>
          value !== "",
      );

    for (const value of values) {
      const numberValue =
        Number(value);

      if (
        Number.isNaN(
          numberValue,
        ) ||
        numberValue < 0 ||
        numberValue > 100
      ) {
        setMessage(
          "Skor değerleri 0 ile 100 arasında olmalıdır.",
        );

        return false;
      }
    }

    const costMin =
      getNumberOrDefault(
        filters.costMin,
        0,
      );

    const costMax =
      getNumberOrDefault(
        filters.costMax,
        100,
      );

    const demandMin =
      getNumberOrDefault(
        filters.demandMin,
        0,
      );

    const demandMax =
      getNumberOrDefault(
        filters.demandMax,
        100,
      );

    const generalMin =
      getNumberOrDefault(
        filters.generalMin,
        0,
      );

    const generalMax =
      getNumberOrDefault(
        filters.generalMax,
        100,
      );

    if (
      costMin > costMax ||
      demandMin > demandMax ||
      generalMin > generalMax
    ) {
      setMessage(
        "Minimum değer maksimum değerden büyük olamaz.",
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
        0,
      );

    const costMax =
      getNumberOrDefault(
        filters.costMax,
        100,
      );

    const demandMin =
      getNumberOrDefault(
        filters.demandMin,
        0,
      );

    const demandMax =
      getNumberOrDefault(
        filters.demandMax,
        100,
      );

    const generalMin =
      getNumberOrDefault(
        filters.generalMin,
        0,
      );

    const generalMax =
      getNumberOrDefault(
        filters.generalMax,
        100,
      );

    const candidatePool =
      scanStatus === "success"
        ? scannedCandidates
        : candidates;

    const result =
      candidatePool.filter(
        (candidate) =>
          isScoreInRange(
            candidate.costScore,
            costMin,
            costMax,
          ) &&
          isScoreInRange(
            candidate.demandScore,
            demandMin,
            demandMax,
          ) &&
          isScoreInRange(
            candidate.generalScore,
            generalMin,
            generalMax,
          ),
      );

    setFilteredCandidates(
      result,
    );

    setSelectedCandidate(
      null,
    );

    if (result.length === 0) {
      setMessage(
        "Belirtilen skor aralıklarında aday nokta bulunamadı.",
      );
    } else {
      setMessage(
        `${result.length} aday nokta filtrelendi.`,
      );
    }
  }

  async function saveCandidate(
    candidate,
  ) {
    function showFeedback(
      feedbackMessage,
    ) {
      setMessage(
        feedbackMessage,
      );

      setSaveFeedback(
        feedbackMessage,
      );

      window.setTimeout(() => {
        setSaveFeedback("");
      }, 2500);
    }

    if (
      candidate?.isManual &&
      !hasCompleteCandidateAnalysis(
        candidate,
      )
    ) {
      showFeedback(
        "Manuel adayın maliyet ve skor analizi tamamlanmadan kayıt yapılamaz.",
      );

      return;
    }

    try {
      const result =
        await saveCandidatePoint(
          candidate,
        );

      if (
        result.status ===
        "already-saved"
      ) {
        showFeedback(
          "Bu aday nokta zaten kaydedilmiş.",
        );

        return;
      }

      if (
        result.status ===
        "limit-exceeded"
      ) {
        showFeedback(
          "En fazla 10 aday nokta kaydedebilirsiniz.",
        );

        return;
      }

      if (
        result.status ===
        "auth-required"
      ) {
        showFeedback(
          result.error ||
            "Aday noktayı kaydetmek için giriş yapmalısınız.",
        );

        return;
      }

      if (
        result.status === "error"
      ) {
        showFeedback(
          result.error ||
            "Aday nokta backend üzerinden kaydedilemedi.",
        );

        return;
      }

      if (
        result.status !== "saved"
      ) {
        showFeedback(
          "Kayıt işlemi tamamlanamadı.",
        );

        return;
      }

      setSavedRefreshKey(
        (currentKey) =>
          currentKey + 1,
      );

      if (
        result.source ===
        "manual-local-storage"
      ) {
        showFeedback(
          "Manuel aday nokta yalnızca bu tarayıcıya kaydedildi.",
        );

        return;
      }

      showFeedback(
        "Aday nokta backend hesabınıza kaydedildi.",
      );
    } catch (error) {
      console.error(
        "Aday nokta kaydedilemedi:",
        error,
      );

      showFeedback(
        error instanceof Error
          ? error.message
          : "Aday nokta kaydedilirken bir hata oluştu.",
      );
    }
  }

  function openAlternativeCandidates() {
    if (!selectedCandidate) {
      setMessage(
        "Alternatifleri görmek için önce bir aday nokta seçin.",
      );

      return;
    }

    if (
      selectedCandidate.isManual &&
      !hasCompleteCandidateAnalysis(
        selectedCandidate,
      )
    ) {
      setMessage(
        "Alternatifleri görmek için önce manuel aday analizinin tamamlanması gerekir.",
      );

      return;
    }

    setAlternativeModalOpen(
      true,
    );
  }

  function closeAlternativeCandidates() {
    setAlternativeModalOpen(
      false,
    );
  }

  function selectAlternativeCandidate(
    candidate,
  ) {
    closeAlternativeCandidates();

    showCandidateOnMap(
      candidate,
    );

    setMessage(
      `${candidate.name || "Alternatif aday"} haritada gösteriliyor.`,
    );
  }

  function handlePersonalizedResult(
    result,
  ) {
    const safeResult =
      Array.isArray(result)
        ? result
        : [];

    setPersonalizedCandidates(
      safeResult,
    );

    setFilteredCandidates(
      safeResult,
    );

    setSelectedCandidate(
      null,
    );
  }

  function handleSelectionChange(
    selection,
  ) {
    setSelectedDataFilter({
      regionId:
        selection.regionId ||
        "0",

      region:
        selection.region ||
        "Tümü",

      neighborhoodId:
        selection.neighborhoodId ||
        "0",

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
    regionId,
  ) {
    const numericRegionId =
      Number(regionId);

    if (
      !Number.isInteger(
        numericRegionId,
      ) ||
      numericRegionId <= 0
    ) {
      setSelectedRegionSummary(
        null,
      );

      setRegionSummaryMessage(
        "",
      );

      return;
    }

    const result =
      await getRegionSummary(
        numericRegionId,
      );

    setSelectedRegionSummary(
      result.data,
    );

    if (result.source === "api") {
      setRegionSummaryMessage(
        "Bölge özeti API üzerinden getirildi.",
      );

      return;
    }

    setRegionSummaryMessage("");
  }

  function handleHomeSearchChange(
    searchValue,
  ) {
    setStationSearch(
      searchValue,
    );

    setActiveHomeSearchIndex(
      -1,
    );

    const normalizedSearch =
      normalizeSearchText(
        searchValue,
      );

    if (!normalizedSearch) {
      clearHomeSearch();

      return;
    }

    setHomeSearchOpen(
      normalizedSearch.length >=
        2,
    );
  }

  function clearHomeSearch() {
    setStationSearch("");

    setHomeSearchOpen(false);

    setHomeSearchSuggestions(
      [],
    );

    setActiveHomeSearchIndex(
      -1,
    );

    setSelectedHomeSearchResult(
      null,
    );

    setHomeSearchSelectionKey(
      (currentKey) =>
        currentKey + 1,
    );
  }

  function selectHomeSearchSuggestion(
    suggestion,
  ) {
    if (!suggestion) {
      return;
    }

    setStationSearch(
      suggestion.label,
    );

    setSelectedHomeSearchResult(
      suggestion,
    );

    setHomeSearchOpen(false);

    setActiveHomeSearchIndex(
      -1,
    );

    setHomeSearchSelectionKey(
      (currentKey) =>
        currentKey + 1,
    );
  }

  function handleHomeSearchKeyDown(
    event,
  ) {
    if (event.key === "Escape") {
      setHomeSearchOpen(false);

      setActiveHomeSearchIndex(
        -1,
      );

      return;
    }

    if (
      homeSearchSuggestions.length ===
      0
    ) {
      return;
    }

    if (
      event.key === "ArrowDown"
    ) {
      event.preventDefault();

      setHomeSearchOpen(true);

      setActiveHomeSearchIndex(
        (currentIndex) => {
          if (
            currentIndex >=
            homeSearchSuggestions.length -
              1
          ) {
            return 0;
          }

          return currentIndex + 1;
        },
      );

      return;
    }

    if (
      event.key === "ArrowUp"
    ) {
      event.preventDefault();

      setHomeSearchOpen(true);

      setActiveHomeSearchIndex(
        (currentIndex) => {
          if (currentIndex <= 0) {
            return (
              homeSearchSuggestions.length -
              1
            );
          }

          return currentIndex - 1;
        },
      );

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const suggestion =
        homeSearchSuggestions[
          activeHomeSearchIndex >=
          0
            ? activeHomeSearchIndex
            : 0
        ];

      selectHomeSearchSuggestion(
        suggestion,
      );
    }
  }

  function resetRegionScanState({
    clearSelectedRegion = true,
    restoreCandidateList = false,
  } = {}) {
    scanRequestIdRef.current +=
      1;

    if (clearSelectedRegion) {
      setSelectedScanRegion(
        null,
      );
    }

    setScannedCandidates([]);

    setScanStatus("idle");

    setScanMessage("");

    setScanError("");

    setScanResultCount(0);

    if (restoreCandidateList) {
      setFilteredCandidates(
        candidates,
      );
    }
  }

  function handleMapPointSelect(
    candidate,
  ) {
    if (!candidate) {
      return;
    }

    setSelectedCandidate(
      candidate,
    );

    setCandidateFocusKey(
      (currentKey) =>
        currentKey + 1,
    );
  }

  function showCandidateOnMap(
    candidate,
  ) {
    if (!candidate) {
      setMessage(
        "Haritada gösterilecek aday nokta bulunamadı.",
      );

      return;
    }

    resetRegionScanState({
      clearSelectedRegion: true,
      restoreCandidateList: false,
    });

    setAlternativeModalOpen(
      false,
    );

    setRegionsActive(false);

    setFocusedRegionId(null);

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1,
    );

    setFilteredCandidates([
      candidate,
    ]);

    setSelectedCandidate(
      candidate,
    );

    setCandidateFocusKey(
      (currentKey) =>
        currentKey + 1,
    );

    setCandidateSearch("");

    setCandidateSearchOpen(
      false,
    );

    setActiveSearchSuggestionIndex(
      -1,
    );

    setActiveTab(
      "candidateMap",
    );

    setMessage(
      `${candidate.name || "Aday nokta"} haritada gösteriliyor.`,
    );
  }

  function openCandidateMap() {
    setRegionsActive(false);

    resetRegionScanState({
      clearSelectedRegion: true,
      restoreCandidateList: false,
    });

    setFilteredCandidates([]);

    setManualPinCandidate(
      null,
    );

    setManualPinStatus("idle");

    setManualPinMessage("");

    setManualPinError("");

    setSelectedCandidate(
      null,
    );

    setAlternativeModalOpen(
      false,
    );

    setFocusedRegionId(null);

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1,
    );

    setCandidateSearch("");

    setCandidateSearchOpen(
      false,
    );

    setActiveSearchSuggestionIndex(
      -1,
    );

    setMessage("");

    setActiveTab(
      "candidateMap",
    );
  }

  function resetCandidateSearch() {
    resetRegionScanState({
      clearSelectedRegion: true,
      restoreCandidateList: false,
    });

    setFilteredCandidates([]);

    setSelectedCandidate(
      null,
    );

    setFocusedRegionId(null);

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1,
    );

    setMessage("");
  }

  function handleCandidateSearchChange(
    searchValue,
  ) {
    setCandidateSearch(
      searchValue,
    );

    setActiveSearchSuggestionIndex(
      -1,
    );

    const normalizedSearch =
      normalizeSearchText(
        searchValue,
      );

    if (!normalizedSearch) {
      setCandidateSearchOpen(
        false,
      );

      resetCandidateSearch();

      return;
    }

    if (
      normalizedSearch.length < 2
    ) {
      setCandidateSearchOpen(
        false,
      );

      setFilteredCandidates([]);

      setSelectedCandidate(
        null,
      );

      setFocusedRegionId(null);

      setRegionFocusKey(
        (currentKey) =>
          currentKey + 1,
      );

      setMessage("");

      return;
    }

    setCandidateSearchOpen(
      true,
    );

    setSelectedCandidate(
      null,
    );

    setFocusedRegionId(null);

    setMessage("");

    const candidateMatches =
      candidates.filter(
        (candidate) =>
          candidateMatchesSearch(
            candidate,
            normalizedSearch,
          ),
      );

    setFilteredCandidates(
      candidateMatches,
    );
  }

  function clearCandidateSearch() {
    setCandidateSearch("");

    setCandidateSearchOpen(
      false,
    );

    setActiveSearchSuggestionIndex(
      -1,
    );

    resetCandidateSearch();
  }

  function selectCandidateSearchSuggestion(
    suggestion,
  ) {
    if (!suggestion) {
      return;
    }

    setCandidateSearch(
      suggestion.label,
    );

    setCandidateSearchOpen(
      false,
    );

    setActiveSearchSuggestionIndex(
      -1,
    );

    if (
      suggestion.type ===
      "candidate"
    ) {
      const candidate =
        suggestion.value;

      resetRegionScanState({
        clearSelectedRegion: true,
        restoreCandidateList: false,
      });

      setRegionsActive(false);

      setFilteredCandidates([
        candidate,
      ]);

      setSelectedCandidate(
        candidate,
      );

      setCandidateFocusKey(
        (currentKey) =>
          currentKey + 1,
      );

      setFocusedRegionId(null);

      setRegionFocusKey(
        (currentKey) =>
          currentKey + 1,
      );

      setMessage(
        `${candidate.name} aday noktası seçildi.`,
      );

      return;
    }

    const region =
      suggestion.value;

    const regionId =
      getRegionId(region);

    const regionName =
      getRegionName(region);

    setRegionsActive(true);

    setFocusedRegionId(
      regionId,
    );

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1,
    );

    scanRequestIdRef.current +=
      1;

    setSelectedScanRegion(
      region,
    );

    setFilteredCandidates([]);

    setScannedCandidates([]);

    setSelectedCandidate(
      null,
    );

    setScanStatus("idle");

    setScanMessage(
      `${regionName} seçildi. Gerçek adayları getirmek için Bölgeyi Tara butonuna basın.`,
    );

    setScanError("");

    setScanResultCount(0);

    setMessage(
      `${regionName} mahallesi seçildi.`,
    );
  }

  function handleCandidateSearchKeyDown(
    event,
  ) {
    if (event.key === "Escape") {
      setCandidateSearchOpen(
        false,
      );

      setActiveSearchSuggestionIndex(
        -1,
      );

      return;
    }

    if (
      candidateSearchSuggestions.length ===
      0
    ) {
      return;
    }

    if (
      event.key === "ArrowDown"
    ) {
      event.preventDefault();

      setCandidateSearchOpen(
        true,
      );

      setActiveSearchSuggestionIndex(
        (currentIndex) => {
          if (
            currentIndex >=
            candidateSearchSuggestions.length -
              1
          ) {
            return 0;
          }

          return currentIndex + 1;
        },
      );

      return;
    }

    if (
      event.key === "ArrowUp"
    ) {
      event.preventDefault();

      setCandidateSearchOpen(
        true,
      );

      setActiveSearchSuggestionIndex(
        (currentIndex) => {
          if (currentIndex <= 0) {
            return (
              candidateSearchSuggestions.length -
              1
            );
          }

          return currentIndex - 1;
        },
      );

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const selectedSuggestion =
        candidateSearchSuggestions[
          activeSearchSuggestionIndex >=
          0
            ? activeSearchSuggestionIndex
            : 0
        ];

      selectCandidateSearchSuggestion(
        selectedSuggestion,
      );
    }
  }

  async function handleScanRegion(
    region = selectedScanRegion,
  ) {
    const regionId =
      getRegionId(region);

    const regionName =
      getRegionName(region) ||
      "Seçili bölge";

    if (
      regionId === null ||
      regionId === undefined ||
      Number(regionId) <= 0
    ) {
      setScanStatus("error");

      setScanMessage("");

      setScanError(
        "Bölgeyi taramak için önce haritadaki bir bölgeyi seçin.",
      );

      setScanResultCount(0);

      return;
    }

    const requestId =
      scanRequestIdRef.current +
      1;

    scanRequestIdRef.current =
      requestId;

    setSelectedScanRegion(
      region,
    );

    setSelectedCandidate(
      null,
    );

    setFilteredCandidates([]);

    setScannedCandidates([]);

    setScanStatus("loading");

    setScanMessage(
      `${regionName} için genel skoru en az ${REGION_SCAN_MIN_GENERAL_SCORE} olan adaylar aranıyor.`,
    );

    setScanError("");

    setScanResultCount(0);

    setMessage("");

    const result =
      await scanCandidatePointsByRegion(
        regionId,
        REGION_SCAN_MIN_GENERAL_SCORE,
      );

    if (
      scanRequestIdRef.current !==
      requestId
    ) {
      return;
    }

    if (
      result.source === "disabled"
    ) {
      setScanStatus("disabled");

      setScanMessage(
        result.message ||
          "Gerçek aday backend'i henüz aktif değil. Demo sonuç gösterilmiyor.",
      );

      setScanError("");

      setScanResultCount(0);

      return;
    }

    if (!result.isRealData) {
      setScanStatus("error");

      setScanMessage("");

      setScanError(
        result.error ||
          "Bölgesel aday noktalar alınamadı.",
      );

      setScanResultCount(0);

      return;
    }

    const safeCandidates =
      (
        Array.isArray(
          result.data,
        )
          ? result.data
          : []
      ).filter((candidate) => {
        const score =
          Number(
            candidate?.generalScore,
          );

        return (
          Number.isFinite(score) &&
          score >=
            REGION_SCAN_MIN_GENERAL_SCORE
        );
      });

    setScannedCandidates(
      safeCandidates,
    );

    setFilteredCandidates(
      safeCandidates,
    );

    setCandidates(
      (currentCandidates) =>
        mergeCandidateLists(
          currentCandidates,
          safeCandidates,
        ),
    );

    setScanResultCount(
      safeCandidates.length,
    );

    if (
      safeCandidates.length ===
      0
    ) {
      setScanStatus("empty");

      setScanMessage(
        `${regionName} için genel skoru ${REGION_SCAN_MIN_GENERAL_SCORE} ve üzeri gerçek aday nokta bulunamadı.`,
      );

      setScanError("");

      setMessage("");

      return;
    }

    setScanStatus("success");

    setScanMessage(
      `${regionName} için ${safeCandidates.length} gerçek aday nokta bulundu.`,
    );

    setScanError("");

    setMessage(
      `${safeCandidates.length} bölgesel aday nokta harita ve kartlara aktarıldı.`,
    );
  }

  function handleRetryRegionScan() {
    handleScanRegion(
      selectedScanRegion,
    );
  }

  function handleCandidateRegionSelect(
    region,
  ) {
    if (!region) {
      return;
    }

    const regionName =
      getRegionName(region);

    const regionId =
      getRegionId(region);

    scanRequestIdRef.current +=
      1;

    manualPinRequestIdRef.current +=
      1;

    setManualPinStatus("idle");

    setManualPinMessage("");

    setManualPinError("");

    setCandidateSearchOpen(
      false,
    );

    setActiveSearchSuggestionIndex(
      -1,
    );

    setFocusedRegionId(
      regionId,
    );

    setSelectedScanRegion(
      region,
    );

    setSelectedCandidate(
      null,
    );

    setFilteredCandidates([]);

    setScannedCandidates([]);

    setScanStatus("idle");

    setScanMessage(
      `${regionName || "Bölge"} seçildi. Gerçek adayları getirmek için Bölgeyi Tara butonuna basın.`,
    );

    setScanError("");

    setScanResultCount(0);

    setMessage(
      `${regionName || "Bölge"} mahallesi seçildi.`,
    );
  }

  async function handleManualPinRequest({
    region,
    regionId,
    latitude,
    longitude,
    preferences = {},
  }) {
    const numericRegionId =
      Number(
        regionId ??
          getRegionId(region),
      );

    const numericLatitude =
      Number(latitude);

    const numericLongitude =
      Number(longitude);

    const normalizedPreferences = {
      systemType:
        String(
          preferences.systemType ??
            "",
        ).trim(),

      placeType:
        String(
          preferences.placeType ??
            "",
        ).trim(),

      powerKw:
        Number(
          preferences.powerKw,
        ),

      connectorCount:
        Number(
          preferences.connectorCount,
        ),

      budget:
        Number(
          preferences.budget,
        ),
    };

    function hasNumericValue(
      value,
    ) {
      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(
          Number(value),
        )
      );
    }

    function removeOldManualCandidate() {
      setManualPinCandidate(
        null,
      );

      setCandidates(
        (currentCandidates) =>
          currentCandidates.filter(
            (candidate) =>
              !candidate?.isManual,
          ),
      );

      setFilteredCandidates(
        (currentCandidates) =>
          currentCandidates.filter(
            (candidate) =>
              !candidate?.isManual,
          ),
      );

      setPersonalizedCandidates(
        (currentCandidates) =>
          currentCandidates.filter(
            (candidate) =>
              !candidate?.isManual,
          ),
      );

      setSelectedCandidate(
        (currentCandidate) =>
          currentCandidate?.isManual
            ? null
            : currentCandidate,
      );
    }

    if (
      !Number.isInteger(
        numericRegionId,
      ) ||
      numericRegionId <= 0
    ) {
      setManualPinStatus(
        "error",
      );

      setManualPinMessage("");

      setManualPinError(
        "Manuel pin için önce geçerli bir bölge seçmelisiniz.",
      );

      return;
    }

    if (
      !Number.isFinite(
        numericLatitude,
      ) ||
      !Number.isFinite(
        numericLongitude,
      )
    ) {
      setManualPinStatus(
        "error",
      );

      setManualPinMessage("");

      setManualPinError(
        "Manuel pin koordinatları geçersiz.",
      );

      return;
    }

    if (
      !normalizedPreferences.systemType ||
      !normalizedPreferences.placeType
    ) {
      setManualPinStatus(
        "error",
      );

      setManualPinMessage("");

      setManualPinError(
        "Manuel pin için sistem ve mekân tipi seçilmelidir.",
      );

      return;
    }

    if (
      !Number.isFinite(
        normalizedPreferences.powerKw,
      ) ||
      normalizedPreferences.powerKw <=
        0 ||
      normalizedPreferences.powerKw >
        1000
    ) {
      setManualPinStatus(
        "error",
      );

      setManualPinMessage("");

      setManualPinError(
        "Manuel pin güç değeri 1 ile 1000 kW arasında olmalıdır.",
      );

      return;
    }

    if (
      !Number.isInteger(
        normalizedPreferences.connectorCount,
      ) ||
      normalizedPreferences.connectorCount <=
        0 ||
      normalizedPreferences.connectorCount >
        50
    ) {
      setManualPinStatus(
        "error",
      );

      setManualPinMessage("");

      setManualPinError(
        "Manuel pin konnektör sayısı 1 ile 50 arasında tam sayı olmalıdır.",
      );

      return;
    }

    if (
      !Number.isFinite(
        normalizedPreferences.budget,
      ) ||
      normalizedPreferences.budget <= 0
    ) {
      setManualPinStatus(
        "error",
      );

      setManualPinMessage("");

      setManualPinError(
        "Manuel pin için geçerli bir kurulum bütçesi girilmelidir.",
      );

      return;
    }

    const requestId =
      manualPinRequestIdRef.current +
      1;

    manualPinRequestIdRef.current =
      requestId;

    removeOldManualCandidate();

    setManualPinStatus(
      "loading",
    );

    setManualPinError("");

    setManualPinMessage(
      "Noktanın bölge ve mahalle kontrolü yapılıyor...",
    );

    try {
      const locateResult =
        await locateRegionPoint(
          numericRegionId,
          {
            latitude:
              numericLatitude,

            longitude:
              numericLongitude,
          },
        );

      if (
        manualPinRequestIdRef.current !==
        requestId
      ) {
        return;
      }

      if (
        !locateResult.isInsideRegion
      ) {
        setManualPinStatus(
          "error",
        );

        setManualPinMessage("");

        setManualPinError(
          "Seçtiğiniz nokta seçili bölgenin dışında. Bölgenin içine tekrar tıklayın.",
        );

        return;
      }

      setManualPinMessage(
        "Tahmini maliyet ve aday skorları hesaplanıyor...",
      );

      const evaluation =
        await evaluateManualPin({
          regionId:
            numericRegionId,

          latitude:
            numericLatitude,

          longitude:
            numericLongitude,

          ...normalizedPreferences,
        });

      if (
        manualPinRequestIdRef.current !==
        requestId
      ) {
        return;
      }

      if (!evaluation.isValid) {
        setManualPinStatus(
          "error",
        );

        setManualPinMessage("");

        setManualPinError(
          evaluation.message ||
            "Manuel pin değerlendirilemedi.",
        );

        return;
      }

      const hasEstimatedCost =
        hasNumericValue(
          evaluation.estimatedCost,
        );

      const hasCostScore =
        hasNumericValue(
          evaluation.costScore,
        );

      const hasDemandScore =
        hasNumericValue(
          evaluation.demandScore,
        );

      const hasGeneralScore =
        hasNumericValue(
          evaluation.generalScore,
        );

      const hasCompleteAnalysis =
        hasEstimatedCost &&
        hasCostScore &&
        hasDemandScore &&
        hasGeneralScore;

      const normalizedEvaluation = {
        ...evaluation,

        estimatedCost:
          hasEstimatedCost
            ? Number(
                evaluation.estimatedCost,
              )
            : null,

        costScore:
          hasCostScore
            ? Number(
                evaluation.costScore,
              )
            : null,

        demandScore:
          hasDemandScore
            ? Number(
                evaluation.demandScore,
              )
            : null,

        generalScore:
          hasGeneralScore
            ? Number(
                evaluation.generalScore,
              )
            : null,

        latitude:
          hasNumericValue(
            evaluation.latitude,
          )
            ? Number(
                evaluation.latitude,
              )
            : numericLatitude,

        longitude:
          hasNumericValue(
            evaluation.longitude,
          )
            ? Number(
                evaluation.longitude,
              )
            : numericLongitude,

        systemType:
          evaluation.systemType ||
          normalizedPreferences.systemType,

        placeType:
          evaluation.placeType ||
          normalizedPreferences.placeType,

        status:
          hasCompleteAnalysis
            ? evaluation.status ||
              "ready"
            : "missing",
      };

      const manualCandidate =
        createManualCandidate(
          normalizedEvaluation,
          locateResult,
          normalizedPreferences,
        );

      setManualPinCandidate(
        manualCandidate,
      );

      setCandidates(
        (currentCandidates) =>
          mergeCandidateLists(
            currentCandidates.filter(
              (candidate) =>
                !candidate?.isManual,
            ),
            [manualCandidate],
          ),
      );

      setFilteredCandidates(
        (currentCandidates) =>
          mergeCandidateLists(
            currentCandidates.filter(
              (candidate) =>
                !candidate?.isManual,
            ),
            [manualCandidate],
          ),
      );

      setPersonalizedCandidates(
        (currentCandidates) =>
          mergeCandidateLists(
            currentCandidates.filter(
              (candidate) =>
                !candidate?.isManual,
            ),
            [manualCandidate],
          ),
      );

      setSelectedCandidate(
        manualCandidate,
      );

      setManualPinStatus(
        "success",
      );

      setManualPinError("");

      if (hasCompleteAnalysis) {
        setManualPinMessage(
          evaluation.message ||
            "Manuel pin başarıyla değerlendirildi.",
        );

        setMessage(
          "Manuel aday nokta maliyet ve skorlarıyla haritaya eklendi.",
        );

        return;
      }

      setManualPinMessage(
        evaluation.message ||
          "Nokta seçili bölge içinde doğrulandı. Maliyet ve skor verileri henüz bulunmadığı için manuel aday eksik veriyle eklendi.",
      );

      setMessage(
        "Manuel aday nokta eklendi. Eksik maliyet ve skorlar backend hazır olduğunda doldurulacak.",
      );
    } catch (error) {
      if (
        manualPinRequestIdRef.current !==
        requestId
      ) {
        return;
      }

      console.error(
        "Manuel pin işlemi başarısız:",
        error,
      );

      setManualPinStatus(
        "error",
      );

      setManualPinMessage("");

      setManualPinError(
        error instanceof Error
          ? error.message
          : "Manuel pin işlemi sırasında hata oluştu.",
      );
    }
  }

  function toggleCandidateRegions() {
    const nextValue =
      !regionsActive;

    setRegionsActive(
      nextValue,
    );

    manualPinRequestIdRef.current +=
      1;

    setManualPinStatus("idle");

    setManualPinMessage("");

    setManualPinError("");

    setManualPinCandidate(
      null,
    );

    setFocusedRegionId(null);

    setSelectedCandidate(
      null,
    );

    setAlternativeModalOpen(
      false,
    );

    setCandidateSearchOpen(
      false,
    );

    setActiveSearchSuggestionIndex(
      -1,
    );

    setRegionFocusKey(
      (currentKey) =>
        currentKey + 1,
    );

    if (!nextValue) {
      resetRegionScanState({
        clearSelectedRegion: true,
        restoreCandidateList: false,
      });

      setFilteredCandidates([]);

      setMessage("");

      return;
    }

    resetRegionScanState({
      clearSelectedRegion: true,
      restoreCandidateList: false,
    });

    setFilteredCandidates([]);

    setMessage(
      "Haritadaki bir bölgeyi seçip Bölgeyi Tara butonuna basın.",
    );
  }

  function handleOpenAdminPanel() {
    window.location.assign("/admin");
  }

  function handleLogout() {
    logoutUser();
    window.location.assign("/login");
  }

  const selectedCandidateActionsDisabled =
    Boolean(
      selectedCandidate?.isManual &&
        !hasCompleteCandidateAnalysis(
          selectedCandidate,
        ),
    );

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
          onClick={
            openCandidateMap
          }
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
              "personalization",
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

      <main
        className="page-content"
        style={
          activeTab === "personalization"
            ? {
                height: "100vh",
                overflowY: "auto",
                overflowX: "hidden",
              }
            : undefined
        }
      >
        {activeTab === "home" && (
          <section
            className="map-screen"
            data-testid="home-map-screen"
          >
            <div className="map-topbar">
              <div
                className="home-search-shell"
                data-testid="home-search-shell"
              >
                <input
                  className="map-search home-search-input"
                  data-testid="home-search-input"
                  placeholder="İstasyon, mahalle veya konum ara"
                  value={stationSearch}
                  autoComplete="off"
                  spellCheck={false}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={
                    homeSearchOpen
                  }
                  aria-controls="home-search-suggestions"
                  aria-activedescendant={
                    activeHomeSearchIndex >=
                    0
                      ? `home-search-option-${
                          homeSearchSuggestions[
                            activeHomeSearchIndex
                          ]?.key
                        }`
                      : undefined
                  }
                  onFocus={() => {
                    if (
                      normalizeSearchText(
                        stationSearch,
                      ).length >= 2
                    ) {
                      setHomeSearchOpen(
                        true,
                      );
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(
                      () => {
                        setHomeSearchOpen(
                          false,
                        );

                        setActiveHomeSearchIndex(
                          -1,
                        );
                      },
                      120,
                    );
                  }}
                  onKeyDown={
                    handleHomeSearchKeyDown
                  }
                  onChange={(
                    event,
                  ) =>
                    handleHomeSearchChange(
                      event.target.value,
                    )
                  }
                />

                {stationSearch && (
                  <button
                    type="button"
                    className="candidate-search-clear-button"
                    aria-label="Aramayı temizle"
                    title="Aramayı temizle"
                    data-testid="home-search-clear-button"
                    onMouseDown={(
                      event,
                    ) =>
                      event.preventDefault()
                    }
                    onClick={
                      clearHomeSearch
                    }
                  >
                    ×
                  </button>
                )}

                {homeSearchOpen && (
                  <div
                    id="home-search-suggestions"
                    className="candidate-search-suggestions"
                    role="listbox"
                    data-testid="home-search-suggestions"
                  >
                    {homeSearchSuggestions.map(
                      (
                        suggestion,
                        index,
                      ) => {
                        const testIdPart =
                          createSearchTestIdPart(
                            suggestion.id,
                          );

                        const isActive =
                          index ===
                          activeHomeSearchIndex;

                        return (
                          <button
                            key={
                              suggestion.key
                            }
                            id={`home-search-option-${suggestion.key}`}
                            type="button"
                            role="option"
                            aria-selected={
                              isActive
                            }
                            className={
                              isActive
                                ? "candidate-search-suggestion active"
                                : "candidate-search-suggestion"
                            }
                            data-testid={`home-search-suggestion-${suggestion.type}-${testIdPart}`}
                            onMouseDown={(
                              event,
                            ) =>
                              event.preventDefault()
                            }
                            onMouseEnter={() =>
                              setActiveHomeSearchIndex(
                                index,
                              )
                            }
                            onClick={() =>
                              selectHomeSearchSuggestion(
                                suggestion,
                              )
                            }
                          >
                            <span className="candidate-search-suggestion-main">
                              <strong>
                                {
                                  suggestion.label
                                }
                              </strong>

                              <small>
                                {
                                  suggestion.description
                                }
                              </small>
                            </span>

                            <em>
                              {
                                suggestion.typeLabel
                              }
                            </em>
                          </button>
                        );
                      },
                    )}

                    {homeSearchSuggestions.length ===
                      0 && (
                      <div
                        className="candidate-search-empty"
                        data-testid="home-search-no-results"
                      >
                        Eşleşen istasyon,
                        mahalle veya konum
                        bulunamadı.
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                      currentValue,
                    ) =>
                      !currentValue,
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
                searchSelection={
                  selectedHomeSearchResult
                }
                searchSelectionKey={
                  homeSearchSelectionKey
                }
                onSearchSuggestionsChange={
                  setHomeSearchSuggestions
                }
                mapStep={
                  regionsActive ? 2 : 1
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
              <div
                className="candidate-search-shell"
                data-testid="candidate-search-shell"
              >
                <input
                  className="map-search candidate-search-input"
                  data-testid="candidate-search-input"
                  placeholder="Aday nokta veya mahalle ara"
                  value={
                    candidateSearch
                  }
                  autoComplete="off"
                  spellCheck={false}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={
                    candidateSearchOpen
                  }
                  aria-controls="candidate-search-suggestions"
                  aria-activedescendant={
                    activeSearchSuggestionIndex >=
                    0
                      ? `candidate-search-option-${
                          candidateSearchSuggestions[
                            activeSearchSuggestionIndex
                          ]?.key
                        }`
                      : undefined
                  }
                  onFocus={() => {
                    if (
                      normalizeSearchText(
                        candidateSearch,
                      ).length >= 2
                    ) {
                      setCandidateSearchOpen(
                        true,
                      );
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(
                      () => {
                        setCandidateSearchOpen(
                          false,
                        );

                        setActiveSearchSuggestionIndex(
                          -1,
                        );
                      },
                      120,
                    );
                  }}
                  onKeyDown={
                    handleCandidateSearchKeyDown
                  }
                  onChange={(
                    event,
                  ) =>
                    handleCandidateSearchChange(
                      event.target.value,
                    )
                  }
                />

                {candidateSearch && (
                  <button
                    type="button"
                    className="candidate-search-clear-button"
                    aria-label="Aramayı temizle"
                    title="Aramayı temizle"
                    data-testid="candidate-search-clear-button"
                    onMouseDown={(
                      event,
                    ) =>
                      event.preventDefault()
                    }
                    onClick={
                      clearCandidateSearch
                    }
                  >
                    ×
                  </button>
                )}

                {candidateSearchOpen && (
                  <div
                    id="candidate-search-suggestions"
                    className="candidate-search-suggestions"
                    role="listbox"
                    data-testid="candidate-search-suggestions"
                  >
                    {candidateSearchSuggestions.map(
                      (
                        suggestion,
                        index,
                      ) => {
                        const testIdPart =
                          createSearchTestIdPart(
                            suggestion.id,
                          );

                        const isActive =
                          index ===
                          activeSearchSuggestionIndex;

                        return (
                          <button
                            key={
                              suggestion.key
                            }
                            id={`candidate-search-option-${suggestion.key}`}
                            type="button"
                            role="option"
                            aria-selected={
                              isActive
                            }
                            className={
                              isActive
                                ? "candidate-search-suggestion active"
                                : "candidate-search-suggestion"
                            }
                            data-testid={`candidate-search-suggestion-${suggestion.type}-${testIdPart}`}
                            onMouseDown={(
                              event,
                            ) =>
                              event.preventDefault()
                            }
                            onMouseEnter={() =>
                              setActiveSearchSuggestionIndex(
                                index,
                              )
                            }
                            onClick={() =>
                              selectCandidateSearchSuggestion(
                                suggestion,
                              )
                            }
                          >
                            <span className="candidate-search-suggestion-main">
                              <strong>
                                {
                                  suggestion.label
                                }
                              </strong>

                              <small>
                                {
                                  suggestion.description
                                }
                              </small>
                            </span>

                            <em>
                              {
                                suggestion.typeLabel
                              }
                            </em>
                          </button>
                        );
                      },
                    )}

                    {candidateSearchSuggestions.length ===
                      0 && (
                      <div
                        className="candidate-search-empty"
                        data-testid="candidate-search-no-results"
                      >
                        Eşleşen aday nokta
                        veya mahalle
                        bulunamadı.
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                candidateFocusKey={
                  candidateFocusKey
                }
                focusedRegionId={
                  focusedRegionId
                }
                regionFocusKey={
                  regionFocusKey
                }
                manualPinCandidate={
                  manualPinCandidate
                }
                manualPinStatus={
                  manualPinStatus
                }
                manualPinMessage={
                  manualPinMessage
                }
                manualPinError={
                  manualPinError
                }
                onManualPinRequest={
                  handleManualPinRequest
                }
                onPointSelect={
                  handleMapPointSelect
                }
                onRegionSelect={
                  handleCandidateRegionSelect
                }
              />

              <aside
                className="candidate-scan-control-panel"
                data-testid="candidate-scan-control-panel"
              >
                <div className="candidate-scan-control-header">
                  <strong>
                    Bölgeyi Tara
                  </strong>

                  <span
                    data-testid="candidate-scan-selected-region"
                  >
                    {selectedScanRegion
                      ? getRegionName(
                          selectedScanRegion,
                        )
                      : "Bölge seçilmedi"}
                  </span>
                </div>

                <button
                  type="button"
                  className="candidate-scan-button"
                  disabled={
                    !regionsActive ||
                    !selectedScanRegion ||
                    scanStatus ===
                      "loading"
                  }
                  onClick={() =>
                    handleScanRegion(
                      selectedScanRegion,
                    )
                  }
                  data-testid="scan-region-button"
                >
                  {scanStatus ===
                  "loading"
                    ? "Bölge Taranıyor..."
                    : "Bölgeyi Tara"}
                </button>

                <small
                  className="candidate-scan-threshold"
                  data-testid="candidate-scan-threshold"
                >
                  Yalnızca genel skoru{" "}
                  {
                    REGION_SCAN_MIN_GENERAL_SCORE
                  }{" "}
                  ve üzeri gerçek
                  adaylar gösterilir.
                </small>

                {scanStatus ===
                  "idle" &&
                  scanMessage && (
                    <div
                      className="candidate-scan-state idle"
                      data-testid="candidate-scan-idle"
                    >
                      <span>
                        {scanMessage}
                      </span>
                    </div>
                  )}

                {scanStatus ===
                  "loading" && (
                  <div
                    className="candidate-scan-state loading"
                    data-testid="candidate-scan-loading"
                  >
                    <span
                      className="candidate-scan-spinner"
                      aria-hidden="true"
                    />

                    <span>
                      {scanMessage ||
                        "Bölgesel aday noktalar aranıyor..."}
                    </span>
                  </div>
                )}

                {scanStatus ===
                  "success" && (
                  <div
                    className="candidate-scan-state success"
                    data-testid="candidate-scan-success"
                  >
                    <strong>
                      {
                        scanResultCount
                      }{" "}
                      aday bulundu.
                    </strong>

                    <span>
                      {scanMessage}
                    </span>
                  </div>
                )}

                {scanStatus ===
                  "empty" && (
                  <div
                    className="candidate-scan-state empty"
                    data-testid="candidate-scan-empty"
                  >
                    <strong>
                      Sonuç bulunamadı.
                    </strong>

                    <span>
                      {scanMessage}
                    </span>
                  </div>
                )}

                {scanStatus ===
                  "disabled" && (
                  <div
                    className="candidate-scan-state disabled"
                    data-testid="candidate-scan-disabled"
                  >
                    <strong>
                      Gerçek veri
                      bekleniyor.
                    </strong>

                    <span>
                      {scanMessage}
                    </span>
                  </div>
                )}

                {scanStatus ===
                  "error" && (
                  <div
                    className="candidate-scan-state error"
                    data-testid="candidate-scan-error"
                  >
                    <strong>
                      Tarama başarısız.
                    </strong>

                    <span>
                      {scanError}
                    </span>

                    <button
                      type="button"
                      className="candidate-scan-retry-button"
                      onClick={
                        handleRetryRegionScan
                      }
                      data-testid="candidate-scan-retry-button"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                )}
              </aside>

              {scanStatus ===
                "success" &&
                filteredCandidates.length >
                  0 && (
                  <aside
                    className="candidate-scan-results-panel"
                    data-testid="candidate-scan-results-panel"
                  >
                    <div className="candidate-scan-results-header">
                      <div>
                        <strong>
                          Bölgesel
                          Sonuçlar
                        </strong>

                        <span>
                          {
                            filteredCandidates.length
                          }{" "}
                          aday
                        </span>
                      </div>

                      <small>
                        Genel skor ≥{" "}
                        {
                          REGION_SCAN_MIN_GENERAL_SCORE
                        }
                      </small>
                    </div>

                    <div className="candidate-scan-results-list">
                      {filteredCandidates.map(
                        (
                          candidate,
                        ) => (
                          <button
                            key={
                              candidate.id
                            }
                            type="button"
                            className={
                              String(
                                selectedCandidate?.id,
                              ) ===
                              String(
                                candidate.id,
                              )
                                ? "candidate-scan-result-card active"
                                : "candidate-scan-result-card"
                            }
                            data-testid={`candidate-scan-result-card-${candidate.id}`}
                            onClick={() =>
                              handleMapPointSelect(
                                candidate,
                              )
                            }
                          >
                            <span className="candidate-scan-result-main">
                              <strong>
                                {
                                  candidate.name
                                }
                              </strong>

                              <small>
                                {candidate.estimatedAddress ||
                                  candidate.region ||
                                  "Adres bilgisi yok"}
                              </small>
                            </span>

                            <em>
                              {showScore(
                                candidate.generalScore,
                              )}
                            </em>
                          </button>
                        ),
                      )}
                    </div>
                  </aside>
                )}

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
                        null,
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

                  <h3>
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
                        selectedCandidate.estimatedCost,
                      )}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Maliyet Skoru:
                    </strong>

                    <span>
                      {showScore(
                        selectedCandidate.costScore,
                      )}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Talep Skoru:
                    </strong>

                    <span>
                      {showScore(
                        selectedCandidate.demandScore,
                      )}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Genel Skor:
                    </strong>

                    <span>
                      {showScore(
                        selectedCandidate.generalScore,
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

                  {selectedCandidate.isManual && (
                    <>
                      <p>
                        <strong>
                          Sistem Tipi:
                        </strong>

                        <span>
                          {selectedCandidate.systemType ||
                            "Veri Eksik"}
                        </span>
                      </p>

                      <p>
                        <strong>
                          Mekân Tipi:
                        </strong>

                        <span>
                          {selectedCandidate.placeType ||
                            "Veri Eksik"}
                        </span>
                      </p>

                      <p>
                        <strong>
                          Güç / Konnektör:
                        </strong>

                        <span>
                          {selectedCandidate.powerKw &&
                          selectedCandidate.connectorCount
                            ? `${selectedCandidate.powerKw} kW / ${selectedCandidate.connectorCount} adet`
                            : "Veri Eksik"}
                        </span>
                      </p>

                      <p>
                        <strong>
                          Kurulum Bütçesi:
                        </strong>

                        <span>
                          {formatMoney(
                            selectedCandidate.budget,
                          )}
                        </span>
                      </p>
                    </>
                  )}

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

                  {selectedCandidateActionsDisabled && (
                    <div
                      className="popup-analysis-required"
                      data-testid="manual-pin-analysis-required-message"
                    >
                      Kaydetmek veya alternatifleri görmek için maliyet ve skor analizinin tamamlanması gerekir.
                    </div>
                  )}

                  <button
                    type="button"
                    className="popup-alternatives-button"
                    data-testid={`popup-alternatives-button-${selectedCandidate.id}`}
                    disabled={
                      selectedCandidateActionsDisabled
                    }
                    onClick={
                      openAlternativeCandidates
                    }
                    title={
                      selectedCandidateActionsDisabled
                        ? "Analiz tamamlanmadan alternatifler gösterilemez"
                        : "Benzer alternatif adayları göster"
                    }
                  >
                    Alternatifleri Gör
                  </button>

                  <button
                    type="button"
                    className="popup-save-button"
                    data-testid={`popup-save-candidate-button-${selectedCandidate.id}`}
                    disabled={
                      selectedCandidateActionsDisabled
                    }
                    onClick={() =>
                      saveCandidate(
                        selectedCandidate,
                      )
                    }
                    title={
                      selectedCandidateActionsDisabled
                        ? "Analiz tamamlanmadan aday kaydedilemez"
                        : "Aday noktayı kaydet"
                    }
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
                  filters={
                    filters
                  }
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
              Firma bütçesi, sistem
              tipi, mekân türü ve
              bölgeye göre aday
              noktalar
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

            {selectedRegionSummary && (
              <section
                className="region-summary-card"
                data-testid="region-summary-card"
              >
                <div className="region-summary-header">
                  <div>
                    <span className="region-summary-eyebrow">
                      Seçili Bölge
                    </span>

                    <h2>
                      Bölge Özeti:{" "}
                      {
                        selectedRegionSummary.regionName
                      }
                    </h2>
                  </div>

                  {regionSummaryMessage && (
                    <span
                      className="region-summary-source"
                      data-testid="region-summary-message"
                    >
                      {
                        regionSummaryMessage
                      }
                    </span>
                  )}
                </div>

                <div className="region-summary-grid">
                  <div>
                    <strong>
                      Toplam İstasyon
                    </strong>

                    <span>
                      {selectedRegionSummary.chargingStationCount ??
                        0}
                    </span>
                  </div>

                  <div>
                    <strong>
                      Trafik Yoğunluğu
                    </strong>

                    <span>
                      {selectedRegionSummary.trafficLevel ||
                        "Veri bulunamadı"}
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

                <div className="company-distribution-section">
                  <div className="company-distribution-header">
                    <h3>
                      Firma Dağılımı
                    </h3>

                    <span>
                      {Array.isArray(
                        selectedRegionSummary.companyDistribution,
                      )
                        ? selectedRegionSummary.companyDistribution.length
                        : 0}{" "}
                      firma
                    </span>
                  </div>

                  {Array.isArray(
                    selectedRegionSummary.companyDistribution,
                  ) &&
                  selectedRegionSummary.companyDistribution.length >
                    0 ? (
                    <div className="company-distribution-list">
                      {selectedRegionSummary.companyDistribution.map(
                        (
                          company,
                          index,
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
                        ),
                      )}
                    </div>
                  ) : (
                    <div
                      className="region-summary-empty"
                      data-testid="company-distribution-empty"
                    >
                      Bu bölge için
                      firma dağılımı
                      verisi bulunamadı.
                    </div>
                  )}
                </div>
              </section>
            )}

            <section
              className="data-layers-section"
              data-testid="data-layers-section"
            >
              <button
                type="button"
                className="data-layers-accordion-button"
                data-testid="data-layers-accordion-button"
                aria-expanded={
                  dataLayersOpen
                }
                aria-controls="data-layers-accordion-content"
                onClick={() =>
                  setDataLayersOpen(
                    (currentValue) =>
                      !currentValue,
                  )
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: "24px",
                  padding: "0",
                  border: "0",
                  background:
                    "transparent",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div className="data-layers-header">
                  <h2>
                    Veri Katmanları
                    Özeti
                  </h2>

                  <p>
                    POI, trafo ve yol
                    katmanı özetlerini
                    görüntülemek için
                    tıklayın.
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: "42px",
                    height: "42px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    borderRadius: "12px",
                    background:
                      "#eef4ff",
                    color: "#2563eb",
                  }}
                >
                  <ChevronDown
                    size={24}
                    strokeWidth={2.4}
                    style={{
                      transform:
                        dataLayersOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      transition:
                        "transform 180ms ease",
                    }}
                  />
                </span>
              </button>

              <div
                className="selected-data-filter"
                data-testid="selected-data-filter"
                style={{
                  marginTop: "16px",
                }}
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

              {dataLayersOpen && (
                <div
                  id="data-layers-accordion-content"
                  data-testid="data-layers-accordion-content"
                  style={{
                    marginTop: "18px",
                  }}
                >
                  <PoiSummary
                    filterBoundaryGeoJson={
                      summarySpatialFilter.boundaryGeoJson
                    }
                    filterLabel={summarySpatialFilter.label}
                    filterLevel={summarySpatialFilter.level}
                    filterLoading={summarySpatialFilter.loading}
                  />
                  <TrafoSummary
                    filterBoundaryGeoJson={
                      summarySpatialFilter.boundaryGeoJson
                    }
                    filterLabel={summarySpatialFilter.label}
                    filterLevel={summarySpatialFilter.level}
                    filterLoading={summarySpatialFilter.loading}
                  />
                  <RoadSummary
                    filterBoundaryGeoJson={
                      summarySpatialFilter.boundaryGeoJson
                    }
                    filterLabel={summarySpatialFilter.label}
                    filterLevel={summarySpatialFilter.level}
                    filterLoading={summarySpatialFilter.loading}
                  />
                </div>
              )}
            </section>

            <h2 className="section-title">
              Kişiselleştirilmiş
              Sonuçlar
            </h2>

            <div
              className="personalized-card-grid"
              data-testid="personalized-candidate-list"
            >
              {personalizedCandidates.length ===
              0 ? (
                <div
                  className="region-summary-empty"
                  data-testid="personalized-candidate-empty"
                >
                  Seçilen kriterlere
                  uygun aday nokta
                  bulunamadı.
                </div>
              ) : (
                personalizedCandidates.map(
                  (candidate) => (
                    <div
                      key={
                        candidate.id
                      }
                      className="personalized-candidate-card"
                      data-testid={`personalized-candidate-card-${candidate.id}`}
                    >
                      <h3>
                        {
                          candidate.name
                        }
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
                        {
                          candidate.region
                        }
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
                          candidate.estimatedCost,
                        )}
                      </p>

                      <div className="score-row">
                        <span>
                          Maliyet Skoru:{" "}
                          {showScore(
                            candidate.costScore,
                          )}
                        </span>

                        <span>
                          Talep Skoru:{" "}
                          {showScore(
                            candidate.demandScore,
                          )}
                        </span>

                        <span>
                          Genel Skor:{" "}
                          {showScore(
                            candidate.generalScore,
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
                            candidate,
                          )
                        }
                      >
                        Haritada Göster
                      </button>
                    </div>
                  ),
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

      {createPortal(
        <div
          data-testid="fixed-map-actions"
          style={{
            position: "fixed",
            left: "7px",
            bottom: "18px",
            zIndex: 2147483647,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            pointerEvents: "auto",
          }}
        >
          {canOpenAdminPanel && (
            <button
              type="button"
              data-testid="admin-panel-menu-button"
              onClick={handleOpenAdminPanel}
              title="Yönetim Paneli"
              aria-label="Yönetim Paneline Git"
              style={{
                width: "42px",
                height: "42px",
                minWidth: "42px",
                minHeight: "42px",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                background:
                  "linear-gradient(145deg, #2563eb, #1d4ed8)",
                border:
                  "1px solid rgba(29, 78, 216, 0.4)",
                borderRadius: "14px",
                cursor: "pointer",
                boxShadow:
                  "0 9px 20px rgba(37, 99, 235, 0.32)",
              }}
            >
              <LayoutDashboard
                size={23}
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </button>
          )}

          <button
            type="button"
            data-testid="logout-menu-button"
            onClick={handleLogout}
            title="Çıkış Yap"
            aria-label="Çıkış Yap"
            style={{
              width: "42px",
              height: "42px",
              minWidth: "42px",
              minHeight: "42px",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              background:
                "linear-gradient(145deg, #ef4444, #b91c1c)",
              border:
                "1px solid rgba(185, 28, 28, 0.4)",
              borderRadius: "14px",
              cursor: "pointer",
              boxShadow:
                "0 9px 20px rgba(220, 38, 38, 0.32)",
            }}
          >
            <Power
              size={23}
              strokeWidth={2.7}
              aria-hidden="true"
            />
          </button>
        </div>,
        document.body,
      )}

      <AlternativeCandidatesModal
        isOpen={
          alternativeModalOpen
        }
        selectedCandidate={
          selectedCandidate
        }
        candidates={candidates}
        onClose={
          closeAlternativeCandidates
        }
        onCandidateSelect={
          selectAlternativeCandidate
        }
        onSaveCandidate={
          saveCandidate
        }
      />
    </div>
  );
}