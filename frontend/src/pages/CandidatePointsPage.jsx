import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  ChevronDown,
  FileText,
  Menu,
  MapPin,
  Search,
  ShieldCheck,
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
  getRegionSummaries,
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
import geovoltLogo from "../assets/geovolt-logo-transparent.png";

import { useAuth } from "../context/AuthContext";

import {
  mapCandidatePoint,
} from "../utils/candidatePointMapper";

import "./CandidateSearch.css";
import "./CandidateScan.css";
import "./PersonalizationLayout.css";

// Yeni logoyu kullanmak için yalnızca bu kaynağı değiştirin.
// Örnek (public klasörü): const SIDEBAR_LOGO_SRC = "/assets/new-logo.svg";
const SIDEBAR_LOGO_SRC = geovoltLogo;

const REGION_SCAN_MIN_GENERAL_SCORE =
  80;

const FALLBACK_HOME_REGIONS = [
  "Kızılay",
  "Kavaklıdere",
  "Ayrancı",
  "Gaziosmanpaşa",
  "Bahçelievler",
  "Cebeci",
  "Dikmen",
  "Öveçler",
  "Balgat",
  "Oran",
  "Çayyolu",
  "Kırkkonaklar",
  "Ahlatlıbel",
  "İmrahor",
  "Diğer / Kırsal",
].map((name, index) => ({
  id: index + 1,
  name,
  isFallback: true,
}));

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

const REPORT_CHART_COLORS = [
  "#3B54C4",
  "#4A63CE",
  "#5A78D6",
  "#6E93E0",
  "#84A9E6",
];

const reportSocketDistributionByNeighborhood = {
  "Bah\u00E7elievler": [
    {
      label: "AC (Yava\u015F)",
      value: 70,
      color: "#22c55e",
    },
    {
      label: "DC (H\u0131zl\u0131)",
      value: 30,
      color: "#f97316",
    },
  ],
  "\u00C7ukurambar": [
    {
      label: "AC (Yava\u015F)",
      value: 40,
      color: "#22c55e",
    },
    {
      label: "DC (H\u0131zl\u0131)",
      value: 60,
      color: "#f97316",
    },
  ],
  "Mustafa Kemal": [
    {
      label: "AC (Yava\u015F)",
      value: 62,
      color: "#22c55e",
    },
    {
      label: "DC (H\u0131zl\u0131)",
      value: 38,
      color: "#f97316",
    },
  ],
  "S\u00F6\u011F\u00FCt\u00F6z\u00FC": [
    {
      label: "AC (Yava\u015F)",
      value: 50,
      color: "#22c55e",
    },
    {
      label: "DC (H\u0131zl\u0131)",
      value: 50,
      color: "#f97316",
    },
  ],
};

const reportNeighborhoodOptions = Object.keys(
  reportSocketDistributionByNeighborhood,
);

function getReportNeighborhoodName(neighborhood) {
  return String(
    neighborhood?.name ??
      neighborhood?.Name ??
      neighborhood?.neighborhoodName ??
      neighborhood?.NeighborhoodName ??
      "",
  ).trim();
}

function getReportNumberProperty(source, propertyNames) {
  for (const propertyName of propertyNames) {
    const value = Number(source?.[propertyName]);

    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return null;
}

function getFallbackSocketDistribution(neighborhoodName) {
  const total = Array.from(
    String(neighborhoodName || "GeoVolt"),
  ).reduce(
    (sum, character) =>
      sum + character.charCodeAt(0),
    0,
  );

  const acValue =
    35 + (total % 46);
  const dcValue =
    100 - acValue;

  return [
    {
      label: "AC (Yava\u015F)",
      value: acValue,
      color: "#22c55e",
    },
    {
      label: "DC (H\u0131zl\u0131)",
      value: dcValue,
      color: "#f97316",
    },
  ];
}

function getReportSocketDistribution(
  neighborhoodName,
  neighborhoods,
) {
  if (
    reportSocketDistributionByNeighborhood[
      neighborhoodName
    ]
  ) {
    return reportSocketDistributionByNeighborhood[
      neighborhoodName
    ];
  }

  const neighborhood =
    neighborhoods.find(
      (item) =>
        getReportNeighborhoodName(item) ===
        neighborhoodName,
    );

  const acCount = getReportNumberProperty(
    neighborhood,
    [
      "acCount",
      "ACCount",
      "acSocketCount",
      "AcSocketCount",
      "slowSocketCount",
      "SlowSocketCount",
    ],
  );

  const dcCount = getReportNumberProperty(
    neighborhood,
    [
      "dcCount",
      "DCCount",
      "dcSocketCount",
      "DcSocketCount",
      "fastSocketCount",
      "FastSocketCount",
    ],
  );

  if (
    acCount !== null &&
    dcCount !== null &&
    acCount + dcCount > 0
  ) {
    const total = acCount + dcCount;

    return [
      {
        label: "AC (Yava\u015F)",
        value: Math.round(
          (acCount / total) * 100,
        ),
        color: "#22c55e",
      },
      {
        label: "DC (H\u0131zl\u0131)",
        value: Math.round(
          (dcCount / total) * 100,
        ),
        color: "#f97316",
      },
    ];
  }

  return getFallbackSocketDistribution(
    neighborhoodName,
  );
}

function buildConicGradient(data) {
  const total = data.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  if (!total) {
    return "#e2e8f0";
  }

  let current = 0;

  return `conic-gradient(${data
    .map((item) => {
      const start = current;
      const end =
        current + (Number(item.value || 0) / total) * 100;

      current = end;

      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ")})`;
}

function ReportPieChart({ data, centerValue }) {
  return (
    <div
      className="report-pie-chart"
      style={{
        background: buildConicGradient(data),
      }}
      aria-hidden="true"
    >
      <span>
        <b>{Math.round(parseReportNumber(centerValue))}</b>
        <small>Toplam İstasyon</small>
      </span>
    </div>
  );
}

function parseReportNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsedValue = Number.parseFloat(
    String(value ?? "0").replace(",", "."),
  );

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatReportPercentage(value) {
  return parseReportNumber(value)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function ReportDonutChart({
  data,
  centerLabel,
}) {
  const total = data.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );
  const size = 230;
  const strokeWidth = 32;
  const radius =
    (size - strokeWidth) / 2;
  const circumference =
    2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="report-donut-wrap">
      <svg
        className="report-donut-chart"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${centerLabel} soket da\u011F\u0131l\u0131m\u0131`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {data.map((item) => {
          const value =
            total > 0
              ? (Number(item.value || 0) / total) *
                circumference
              : 0;
          const dashOffset =
            -offset;

          offset += value;

          return (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${value} ${
                circumference - value
              }`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${
                size / 2
              })`}
            />
          );
        })}
      </svg>

      <div className="report-donut-center">
        <b>{Math.round(total)}%</b>
        <strong>{centerLabel}</strong>
        <span>{"Soket oran\u0131"}</span>
      </div>
    </div>
  );
}

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
          "",

        placeType:
          evaluation.placeType ||
          "",

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
    token,
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
    activePersonalizationTab,
    setActivePersonalizationTab,
  ] = useState("form");

  const [
    selectedReportNeighborhood,
    setSelectedReportNeighborhood,
  ] = useState(reportNeighborhoodOptions[0]);

  const [
    dataLayersOpen,
    setDataLayersOpen,
  ] = useState(true);

  const [
    activeSubTab,
    setActiveSubTab,
  ] = useState("poi");

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
    reportRegionSummaries,
    setReportRegionSummaries,
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
    selectedHomeRegionId,
    setSelectedHomeRegionId,
  ] = useState("");

  const [
    selectedHomeNeighborhoodId,
    setSelectedHomeNeighborhoodId,
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
    sidebarCollapsed,
    setSidebarCollapsed,
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

  const homeRegionOptions =
    useMemo(
      () => {
        const validRegions = regions
          .filter(
            (region) => {
              const regionId = Number(getLocationId(region));
              return Number.isFinite(regionId) && regionId > 0 && getLocationName(region);
            },
          )
          .sort((first, second) =>
            getLocationName(first).localeCompare(
              getLocationName(second),
              "tr-TR",
            ),
          );

        return validRegions.length > 0
          ? validRegions
          : FALLBACK_HOME_REGIONS;
      },
      [regions],
    );

  const homeNeighborhoodOptions =
    useMemo(() => {
      const selectedRegionNumber = Number(
        selectedHomeRegionId,
      );

      return neighborhoods
        .filter((neighborhood) => {
          const neighborhoodName =
            getLocationName(neighborhood);

          if (!neighborhoodName) {
            return false;
          }

          if (
            !Number.isInteger(
              selectedRegionNumber,
            ) ||
            selectedRegionNumber <= 0
          ) {
            return true;
          }

          const neighborhoodRegionId = Number(
            neighborhood?.regionId ??
              neighborhood?.RegionId,
          );

          return (
            Number.isInteger(
              neighborhoodRegionId,
            ) &&
            neighborhoodRegionId ===
              selectedRegionNumber
          );
        })
        .sort((first, second) =>
          getLocationName(first).localeCompare(
            getLocationName(second),
            "tr-TR",
          ),
        );
    }, [
      neighborhoods,
      selectedHomeRegionId,
    ]);

  useEffect(() => {
    let isMounted = true;

    const usableRegions = regions.filter(
      (region) => {
        const regionId = Number(region?.regionId);

        return (
          Number.isInteger(regionId) &&
          regionId > 0
        );
      },
    );

    if (usableRegions.length === 0) {
      setReportRegionSummaries([]);

      return () => {
        isMounted = false;
      };
    }

    async function loadReportRegionSummaries() {
      const response = await getRegionSummaries(
        usableRegions,
        token,
      );

      if (!isMounted) {
        return;
      }

      if (!Array.isArray(response.data)) {
        setReportRegionSummaries([]);
        return;
      }

      console.debug(
        "[GeoVolt][Report] Direct response.data assigned to state",
        response.data,
      );
      setReportRegionSummaries(response.data);
    }

    loadReportRegionSummaries();

    return () => {
      isMounted = false;
    };
  }, [regions, token]);

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

  function handleHomeRegionSelect(
    event,
  ) {
    const nextRegionId =
      event.target.value;

    setSelectedHomeRegionId(
      nextRegionId,
    );

    setSelectedHomeNeighborhoodId(
      "",
    );

    if (!nextRegionId) {
      clearHomeSearch();

      return;
    }

    const selectedRegion =
      homeRegionOptions.find(
        (region) =>
          String(
            getLocationId(region),
          ) ===
          String(nextRegionId),
      );

    if (!selectedRegion) {
      return;
    }

    const regionName =
      getLocationName(
        selectedRegion,
      );

    setRegionsActive(true);

    selectHomeSearchSuggestion({
      key: `region-dropdown-${nextRegionId}`,
      id: nextRegionId,
      type: "region",
      typeLabel: "Bölge",
      label: regionName,
      description:
        "Bölge sınırını haritada göster",
      regionId:
        Number(nextRegionId),
    });
  }

  function handleHomeNeighborhoodSelect(
    event,
  ) {
    const nextNeighborhoodId =
      event.target.value;

    setSelectedHomeNeighborhoodId(
      nextNeighborhoodId,
    );

    if (!nextNeighborhoodId) {
      if (selectedHomeRegionId) {
        handleHomeRegionSelect({
          target: {
            value:
              selectedHomeRegionId,
          },
        });
      } else {
        clearHomeSearch();
      }

      return;
    }

    const selectedNeighborhood =
      homeNeighborhoodOptions.find(
        (neighborhood) =>
          String(
            getLocationId(
              neighborhood,
            ),
          ) ===
          String(nextNeighborhoodId),
      );

    if (!selectedNeighborhood) {
      return;
    }

    const neighborhoodName =
      getLocationName(
        selectedNeighborhood,
      );

    const neighborhoodRegionId =
      Number(
        selectedNeighborhood
          ?.regionId ??
          selectedNeighborhood
            ?.RegionId ??
          selectedHomeRegionId,
      );

    if (
      Number.isInteger(
        neighborhoodRegionId,
      ) &&
      neighborhoodRegionId > 0
    ) {
      setSelectedHomeRegionId(
        String(
          neighborhoodRegionId,
        ),
      );

      setRegionsActive(true);

      selectHomeSearchSuggestion({
        key: `neighborhood-dropdown-${nextNeighborhoodId}`,
        id: nextNeighborhoodId,
        type: "region",
        typeLabel: "Mahalle",
        label: neighborhoodName,
        description:
          "Mahallenin bağlı olduğu bölgeyi haritada göster",
        regionId:
          neighborhoodRegionId,
      });

      return;
    }

    setStationSearch(
      neighborhoodName,
    );

    setSelectedHomeSearchResult(
      null,
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

  const dynamicReportNeighborhoodOptions =
    useMemo(() => {
      const names = reportRegionSummaries
        .map((summary) => summary.regionName)
        .filter(Boolean);

      return names.length > 0
        ? names
        : reportNeighborhoodOptions;
    }, [reportRegionSummaries]);

  useEffect(() => {
    if (
      dynamicReportNeighborhoodOptions.includes(
        selectedReportNeighborhood,
      )
    ) {
      return;
    }

    setSelectedReportNeighborhood(
      dynamicReportNeighborhoodOptions[0],
    );
  }, [
    dynamicReportNeighborhoodOptions,
    selectedReportNeighborhood,
  ]);

  const selectedReportRegionSummary =
    reportRegionSummaries.find(
      (summary) =>
        summary.regionName === selectedReportNeighborhood,
    ) ?? null;

  const reportStationTotal = reportRegionSummaries.reduce(
    (total, summary) =>
      total + parseReportNumber(summary.chargingStationCount),
    0,
  );

  const selectedAcCount = parseReportNumber(
    selectedReportRegionSummary?.acCount,
  );
  const selectedDcCount = parseReportNumber(
    selectedReportRegionSummary?.dcCount,
  );
  const selectedSocketTotal = selectedAcCount + selectedDcCount;

  const reportAcSocketTotal = reportRegionSummaries.reduce(
    (total, summary) => total + parseReportNumber(summary.acCount),
    0,
  );
  const reportDcSocketTotal = reportRegionSummaries.reduce(
    (total, summary) => total + parseReportNumber(summary.dcCount),
    0,
  );
  const reportSocketTotal = reportAcSocketTotal + reportDcSocketTotal;
  const formatReportCount = (value) =>
    Math.round(parseReportNumber(value)).toLocaleString("tr-TR");

  const dynamicReportRegionDistribution =
    reportRegionSummaries.map((summary, index) => {
      const parsedPercentage = Number.parseFloat(
        String(summary.chargingStationPercentage ?? "0").replace(",", "."),
      );
      const percentage = Number.isFinite(parsedPercentage)
        ? parsedPercentage
        : 0;

      return {
          label: summary.regionName,
          value:
            percentage ||
            (reportStationTotal > 0
              ? (parseReportNumber(summary.chargingStationCount) /
                  reportStationTotal) *
                100
              : 0),
          color:
            REPORT_CHART_COLORS[
              index % REPORT_CHART_COLORS.length
            ],
        };
    });

  const selectedReportSocketDistribution =
    selectedReportRegionSummary
      ? [
          {
            label: "AC (Yavaş)",
            value:
              parseReportNumber(
                selectedReportRegionSummary.acPercentage,
              ) ||
              (selectedSocketTotal > 0
                ? (selectedAcCount / selectedSocketTotal) * 100
                : 0),
            color: "#3B54C4",
          },
          {
            label: "DC (Hızlı)",
            value:
              parseReportNumber(
                selectedReportRegionSummary.dcPercentage,
              ) ||
              (selectedSocketTotal > 0
                ? (selectedDcCount / selectedSocketTotal) * 100
                : 0),
            color: "#6EA0E0",
          },
        ]
      : getFallbackSocketDistribution(
          selectedReportNeighborhood,
        );

  function handleLogout() {
    logoutUser();
    window.location.assign("/login");
  }

  return (
    <div
      className="candidate-page"
      data-testid="candidate-points-page"
    >      <aside
        className={
          sidebarCollapsed
            ? "left-menu dashboard-sidebar collapsed"
            : "left-menu dashboard-sidebar"
        }
        data-testid="left-menu"
      >
        <button
          type="button"
          className="sidebar-collapse-button"
          data-testid="sidebar-collapse-button"
          aria-label={
            sidebarCollapsed
              ? "Menüyü genişlet"
              : "Menüyü daralt"
          }
          title={
            sidebarCollapsed
              ? "Menüyü genişlet"
              : "Menüyü daralt"
          }
          onClick={() =>
            setSidebarCollapsed(
              (currentValue) =>
                !currentValue,
            )
          }
        >
          <Menu size={20} strokeWidth={2.3} />
        </button>

        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">
            <img
              src={SIDEBAR_LOGO_SRC}
              alt="GeoVolt"
              className="sidebar-brand-logo"
            />
          </span>

          <strong>GeoVolt</strong>

          <small>
            {"\u0130stasyon Y\u00F6netimi"}
          </small>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Ana menu"
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
            <MapPin
              size={26}
              strokeWidth={2.3}
            />
            <span>{"Mevcut istasyon haritas\u0131"}</span>
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
            <span>{"Aday nokta haritas\u0131"}</span>
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
            <span>Kaydedilenler</span>
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
            <span>{"Ki\u015Fiselle\u015Ftirme"}</span>
          </button>

          <button
            type="button"
            className={
              activeTab === "report"
                ? "menu-button active"
                : "menu-button"
            }
            data-testid="report-tab-button"
            onClick={() =>
              setActiveTab("report")
            }
            title="Rapor"
          >
            <FileText
              size={26}
              strokeWidth={2.3}
            />
            <span>Rapor</span>
          </button>

          {canOpenAdminPanel && (
            <button
              type="button"
              className="menu-button"
              data-testid="admin-panel-menu-button"
              onClick={handleOpenAdminPanel}
              title="Yönetim Paneli"
            >
              <ShieldCheck
                size={26}
                strokeWidth={2.3}
              />
              <span>{"Y\u00F6netim paneli"}</span>
            </button>
          )}
        </nav>

        <button
          type="button"
          className="menu-button logout-menu-button"
          data-testid="logout-menu-button"
          onClick={handleLogout}
          title="Çıkış"
        >
          <Power
            size={26}
            strokeWidth={2.4}
          />
          <span>{"\u00C7\u0131k\u0131\u015F"}</span>
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
          activeTab === "personalization" ||
          activeTab === "report"
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
            <div className="map-topbar dashboard-header">

              <div
                className="home-location-controls"
                data-testid="home-location-controls"
              >
                <label className="home-location-select">
                  <span>Bölge</span>
                  <select
                    value={selectedHomeRegionId}
                    onChange={handleHomeRegionSelect}
                    data-testid="home-region-select"
                  >
                    <option value="">Bölge Seçin</option>
                    {homeRegionOptions.map((region) => {
                      const regionId = getLocationId(region);

                      return (
                        <option key={regionId} value={regionId}>
                          {getLocationName(region)}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className={
                  regionsActive
                    ? "region-toggle active dashboard-region-toggle"
                    : "region-toggle dashboard-region-toggle"
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
                  ? "Bölgeler Aktif"
                  : "Bölgeler İnaktif"}
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
                    className="popup-alternatives-button"
                    data-testid={`popup-alternatives-button-${selectedCandidate.id}`}
                    onClick={
                      openAlternativeCandidates
                    }
                    title="Benzer alternatif adayları göster"
                  >
                    Alternatifleri Gör
                  </button>

                  <button
                    type="button"
                    className="popup-save-button"
                    data-testid={`popup-save-candidate-button-${selectedCandidate.id}`}
                    onClick={() =>
                      saveCandidate(
                        selectedCandidate,
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
            <nav
              className="personalization-tabs"
              aria-label="Kişiselleştirme bölümleri"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activePersonalizationTab === "form"}
                className={activePersonalizationTab === "form" ? "active" : ""}
                onClick={() => setActivePersonalizationTab("form")}
              >
                <SlidersHorizontal size={18} strokeWidth={2.2} />
                <span>Kişiselleştirme Formu</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activePersonalizationTab === "layers"}
                className={activePersonalizationTab === "layers" ? "active" : ""}
                onClick={() => setActivePersonalizationTab("layers")}
              >
                <LayoutDashboard size={18} strokeWidth={2.2} />
                <span>Veri Katmanları Özeti</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activePersonalizationTab === "results"}
                className={activePersonalizationTab === "results" ? "active" : ""}
                onClick={() => setActivePersonalizationTab("results")}
              >
                <ListChecks size={18} strokeWidth={2.2} />
                <span>Kişiselleştirilmiş Sonuçlar</span>
              </button>
            </nav>

            {activePersonalizationTab === "form" && (
              <>
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
              </>
            )}

            {activePersonalizationTab === "layers" && (
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

              <nav
                className="data-layer-subtabs"
                aria-label="Veri katmanları"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSubTab === "poi"}
                  className={activeSubTab === "poi" ? "active" : ""}
                  onClick={() => setActiveSubTab("poi")}
                >
                  <span aria-hidden="true">📍</span>
                  POI Talep Verisi Özeti
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSubTab === "trafo"}
                  className={activeSubTab === "trafo" ? "active" : ""}
                  onClick={() => setActiveSubTab("trafo")}
                >
                  <span aria-hidden="true">⚡</span>
                  Trafo Enerji Verisi Özeti
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSubTab === "road"}
                  className={activeSubTab === "road" ? "active" : ""}
                  onClick={() => setActiveSubTab("road")}
                >
                  <span aria-hidden="true">🛣️</span>
                  Yol Erişilebilirlik Verisi Özeti
                </button>
              </nav>

              {dataLayersOpen && (
                <div
                  id="data-layers-accordion-content"
                  data-testid="data-layers-accordion-content"
                  style={{
                    marginTop: "18px",
                  }}
                >
                  {activeSubTab === "poi" && (
                  <PoiSummary
                    filterBoundaryGeoJson={
                      summarySpatialFilter.boundaryGeoJson
                    }
                    filterLabel={summarySpatialFilter.label}
                    filterLevel={summarySpatialFilter.level}
                    filterLoading={summarySpatialFilter.loading}
                  />
                  )}
                  {activeSubTab === "trafo" && (
                  <TrafoSummary
                    filterBoundaryGeoJson={
                      summarySpatialFilter.boundaryGeoJson
                    }
                    filterLabel={summarySpatialFilter.label}
                    filterLevel={summarySpatialFilter.level}
                    filterLoading={summarySpatialFilter.loading}
                  />
                  )}
                  {activeSubTab === "road" && (
                  <RoadSummary
                    filterBoundaryGeoJson={
                      summarySpatialFilter.boundaryGeoJson
                    }
                    filterLabel={summarySpatialFilter.label}
                    filterLevel={summarySpatialFilter.level}
                    filterLoading={summarySpatialFilter.loading}
                  />
                  )}
                </div>
              )}
            </section>
            )}

            {activePersonalizationTab === "results" && (
            <section className="personalization-results-panel" role="tabpanel">
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
          </section>
        )}

        {activeTab === "report" && (
          <section
            className="report-screen"
            data-testid="report-screen"
          >
            <header className="report-page-header">
              <span>Rapor Merkezi</span>
              <h1>
                {"\u0130stasyon analiz raporlar\u0131"}
              </h1>
              <p>
                {"B\u00F6lge, mahalle ve soket tiplerine g\u00F6re da\u011F\u0131l\u0131m\u0131 tek ekranda takip edin."}
              </p>
            </header>

            <div className="report-dashboard-layout">
              <div className="report-kpi-column report-kpi-left">
              <article className="report-kpi-card report-kpi-stations">
                <span className="report-kpi-icon"><LayoutDashboard size={20} /></span>
                <p>Toplam İstasyon</p>
                <strong>{formatReportCount(reportStationTotal)}</strong>
                <small>Canlı bölge verisi</small>
              </article>
              <article className="report-kpi-card report-kpi-sockets">
                <span className="report-kpi-icon"><Zap size={20} /></span>
                <p>Toplam Soket</p>
                <strong>{formatReportCount(reportSocketTotal)}</strong>
                <small>AC ve DC toplamı</small>
              </article>
              <article className="report-kpi-card report-kpi-ac">
                <span className="report-kpi-icon"><Power size={20} /></span>
                <p>AC Soket</p>
                <strong>{formatReportCount(reportAcSocketTotal)}</strong>
                <small>Yavaş şarj soketi</small>
              </article>
              <article className="report-kpi-card report-kpi-dc">
                <span className="report-kpi-icon"><Zap size={20} /></span>
                <p>DC Soket</p>
                <strong>{formatReportCount(reportDcSocketTotal)}</strong>
                <small>Hızlı şarj soketi</small>
              </article>
              </div>

            <div className="report-chart-grid">
              <article className="report-chart-card">
                <div className="report-card-heading">
                  <span>{"Genel da\u011F\u0131l\u0131m"}</span>
                  <h2>
                    {"Semtlere G\u00F6re \u0130stasyon Da\u011F\u0131l\u0131m\u0131"}
                  </h2>
                  <p>
                    {"Mevcut istasyonlar\u0131n b\u00F6lgesel pay\u0131."}
                  </p>
                </div>

                <ReportPieChart
                  data={dynamicReportRegionDistribution}
                  centerValue={reportStationTotal}
                />

                <div className="report-legend">
                  {reportRegionSummaries.map(
                    (summary, index) => {
                      const parsedPercentage = Number.parseFloat(
                        String(
                          summary.chargingStationPercentage ?? "0",
                        ).replace(",", "."),
                      );
                      const percentage = Number.isFinite(parsedPercentage)
                        ? parsedPercentage
                        : 0;

                      return (
                      <div
                        className="report-legend-row"
                        key={summary.regionId ?? summary.regionName}
                      >
                        <span
                          className="report-dot"
                          style={{
                            backgroundColor:
                              REPORT_CHART_COLORS[
                                index % REPORT_CHART_COLORS.length
                              ],
                          }}
                        />
                        <strong>
                          {summary.regionName}
                        </strong>
                        <em>
                          %{percentage.toFixed(2)}
                        </em>
                      </div>
                      );
                    },
                  )}
                  {reportRegionSummaries.length === 0 && (
                    <p className="report-legend-empty">
                      Semt rapor verileri yüklenemedi. Oturum ve API
                      isteğini kontrol edin.
                    </p>
                  )}
                </div>
              </article>

              <article className="report-chart-card">
                <div className="report-card-heading report-card-heading-row">
                  <div>
                    <span>Semt analizi</span>
                    <h2>
                      {"Semt Bazlı Soket Dağılımı"}
                    </h2>
                    <p>
                      {"Se\u00E7ilen semte g\u00F6re AC/DC oran\u0131."}
                    </p>
                  </div>

                  <label className="report-select-shell">
                    <span>{"Semt se\u00E7"}</span>
                    <select
                      value={
                        selectedReportNeighborhood
                      }
                      onChange={(event) =>
                        setSelectedReportNeighborhood(
                          event.target.value,
                        )
                      }
                    >
                      {dynamicReportNeighborhoodOptions.map(
                        (neighborhood) => (
                          <option
                            key={neighborhood}
                            value={neighborhood}
                          >
                            {neighborhood}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>

                <div className="report-socket-layout">
                  <ReportDonutChart
                    data={selectedReportSocketDistribution}
                    centerLabel={selectedReportNeighborhood}
                  />

                  <div className="report-analysis-bars">
                    {selectedReportSocketDistribution.map(
                    (item) => (
                      <div
                        className="report-analysis-row"
                        key={item.label}
                      >
                        <div className="report-analysis-label">
                          <span
                            className="report-dot"
                            style={{ backgroundColor: item.color }}
                          />
                          <strong>{item.label}</strong>
                          <em>%{formatReportPercentage(item.value)}</em>
                        </div>
                        <div className="report-analysis-track">
                          <span
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  parseReportNumber(item.value),
                                ),
                              )}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    ),
                    )}
                  </div>
                </div>
              </article>
            </div>
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


