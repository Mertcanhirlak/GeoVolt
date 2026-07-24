const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const LOCAL_MAHALLE_URL = "/data/MAHALLE.geojson";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function notifyUnauthorized(response, url) {
  if (response.status !== 401 || typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("geovolt:unauthorized", {
      detail: { url, status: 401 }
    })
  );
}

const allRegionOption = { id: 0, name: "Tümü", boundaryGeoJson: "" };

const fallbackRegions = [
  allRegionOption,
  { id: 1, name: "Çankaya", boundaryGeoJson: "" },
  { id: 2, name: "Yenimahalle", boundaryGeoJson: "" },
  { id: 3, name: "Etimesgut", boundaryGeoJson: "" },
  { id: 4, name: "Keçiören", boundaryGeoJson: "" },
  { id: 5, name: "Mamak", boundaryGeoJson: "" }
];

const fallbackNeighborhoods = [
  { id: 1, name: "Kızılay Mahallesi", regionName: "Çankaya" },
  { id: 2, name: "Söğütözü Mahallesi", regionName: "Çankaya" },
  { id: 3, name: "Bahçelievler Mahallesi", regionName: "Çankaya" },
  { id: 4, name: "Oran Mahallesi", regionName: "Çankaya" },
  { id: 5, name: "Kavaklıdere Mahallesi", regionName: "Çankaya" },
  { id: 6, name: "Batıkent Mahallesi", regionName: "Yenimahalle" },
  { id: 7, name: "Eryaman Mahallesi", regionName: "Etimesgut" }
];

const fallbackRegionSummaries = {
  1: {
    regionId: 1,
    regionName: "Çankaya",
    chargingStationCount: 8,
    trafficLevel: "Yoğun",
    mostCommonSocketType: "Type 2",
    mostCommonPowerKw: 22,
    companyDistribution: [
      { companyName: "ZES", stationCount: 3 },
      { companyName: "Eşarj", stationCount: 2 },
      { companyName: "Trugo", stationCount: 3 }
    ]
  },
  2: {
    regionId: 2,
    regionName: "Yenimahalle",
    chargingStationCount: 5,
    trafficLevel: "Orta",
    mostCommonSocketType: "CCS",
    mostCommonPowerKw: 50,
    companyDistribution: [
      { companyName: "ZES", stationCount: 2 },
      { companyName: "Voltrun", stationCount: 1 },
      { companyName: "Eşarj", stationCount: 2 }
    ]
  },
  3: {
    regionId: 3,
    regionName: "Etimesgut",
    chargingStationCount: 4,
    trafficLevel: "Orta",
    mostCommonSocketType: "Type 2",
    mostCommonPowerKw: 22,
    companyDistribution: [
      { companyName: "ZES", stationCount: 2 },
      { companyName: "Trugo", stationCount: 2 }
    ]
  }
};

function extractArray(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.regions)) {
    return result.regions;
  }

  if (Array.isArray(result?.neighborhoods)) {
    return result.neighborhoods;
  }

  if (Array.isArray(result?.features)) {
    return result.features;
  }

  return null;
}

function extractObject(result) {
  if (!result) {
    return null;
  }

  if (result.data && typeof result.data === "object") {
    return result.data;
  }

  return result;
}

function getProperty(source, propertyNames) {
  for (const propertyName of propertyNames) {
    if (source?.[propertyName] !== undefined && source?.[propertyName] !== null) {
      return source[propertyName];
    }
  }

  return null;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function isUsableName(value) {
  const text = normalizeText(value);

  if (!text) {
    return false;
  }

  if (/^\d+$/.test(text)) {
    return false;
  }

  if (/^mahalle\s*\d+$/i.test(text)) {
    return false;
  }

  if (/^bölge\s*\d+$/i.test(text)) {
    return false;
  }

  return true;
}

function findNameByKeyPattern(properties, patterns) {
  if (!properties || typeof properties !== "object") {
    return "";
  }

  const entries = Object.entries(properties);

  for (const [key, value] of entries) {
    const normalizedKey = key
      .toLocaleLowerCase("tr-TR")
      .replaceAll("_", "")
      .replaceAll("-", "")
      .replaceAll(" ", "");

    const keyMatches = patterns.some((pattern) =>
      normalizedKey.includes(pattern)
    );

    if (keyMatches && isUsableName(value)) {
      return normalizeText(value);
    }
  }

  return "";
}

function getNeighborhoodName(properties) {
  const directValue = getProperty(properties, [
    "neighborhood",
    "neighborhoodName",
    "mahalle",
    "MAHALLE",
    "mahalleAdi",
    "MAHALLEADI",
    "MAHALLE_ADI",
    "mahalle_ad",
    "MAHALLE_AD",
    "mahalle_adi",
    "MAHALLE_ADI",
    "mah_adi",
    "MAH_ADI",
    "mahAd",
    "MAH_AD",
    "mahallesi",
    "MAHALLESI",
    "ad",
    "AD",
    "adi",
    "ADI",
    "name",
    "NAME"
  ]);

  if (isUsableName(directValue)) {
    return normalizeText(directValue);
  }

  return findNameByKeyPattern(properties, [
    "mahalleadi",
    "mahallead",
    "mahadi",
    "mahalle",
    "mahalles",
    "adi",
    "ad",
    "name"
  ]);
}

function getRegionName(properties) {
  const directValue = getProperty(properties, [
    "region",
    "regionName",
    "district",
    "districtName",
    "ilceAdi",
    "ILCEADI",
    "ILCE_ADI",
    "ilce_ad",
    "ILCE_AD",
    "ilce",
    "ILCE",
    "ilçe",
    "İLÇE",
    "name",
    "NAME"
  ]);

  if (isUsableName(directValue)) {
    return normalizeText(directValue);
  }

  return findNameByKeyPattern(properties, [
    "ilceadi",
    "ilcead",
    "ilce",
    "ilçe",
    "district",
    "region"
  ]);
}

function formatNeighborhoodName(name) {
  const cleanName = normalizeText(name);

  if (!cleanName) {
    return "";
  }

  const lowerName = cleanName.toLocaleLowerCase("tr-TR");

  if (lowerName.includes("mahallesi")) {
    return cleanName;
  }

  if (lowerName.includes("mahalle")) {
    return cleanName;
  }

  return `${cleanName} Mahallesi`;
}

function getBoundaryGeoJson(item) {
  if (item.boundaryGeoJson) {
    return item.boundaryGeoJson;
  }

  if (item.geoJson) {
    return item.geoJson;
  }

  if (item.geometry) {
    return JSON.stringify(item.geometry);
  }

  return "";
}

function normalizeRegion(region, index) {
  const properties = region.properties ?? region;
  const regionName = getRegionName(properties);

  if (!isUsableName(regionName)) {
    return null;
  }

  return {
    id:
      getProperty(properties, [
        "id",
        "regionId",
        "objectId",
        "OBJECTID",
        "ilceId",
        "ILCE_ID"
      ]) ?? index + 1,

    name: regionName,
    population: Number(properties.population ?? properties.POPULATION ?? 0),
    boundaryGeoJson: getBoundaryGeoJson(region)
  };
}

function normalizeNeighborhood(neighborhood, index) {
  const properties = neighborhood.properties ?? neighborhood;

  const neighborhoodName = getNeighborhoodName(properties);
  const regionName = getRegionName(properties) || "Bölge bilgisi yok";

  if (!isUsableName(neighborhoodName)) {
    return null;
  }

  return {
    id:
      getProperty(properties, [
        "id",
        "neighborhoodId",
        "mahalleId",
        "MAHALLE_ID",
        "objectId",
        "OBJECTID"
      ]) ?? index + 1,

    name: formatNeighborhoodName(neighborhoodName),
    regionId: Number(properties.regionId ?? properties.REGION_ID ?? 0),
    regionName,
    population: Number(properties.population ?? properties.POPULATION ?? 0),
    boundaryGeoJson: getBoundaryGeoJson(neighborhood)
  };
}

function normalizeRegions(regionArray) {
  const regionMap = new Map();

  regionArray.forEach((region, index) => {
    const normalizedRegion = normalizeRegion(region, index);

    if (!normalizedRegion) {
      return;
    }

    if (!regionMap.has(normalizedRegion.name)) {
      regionMap.set(normalizedRegion.name, normalizedRegion);
    }
  });

  return Array.from(regionMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "tr-TR")
  );
}

function normalizeNeighborhoods(neighborhoodArray) {
  const neighborhoodMap = new Map();

  neighborhoodArray.forEach((neighborhood, index) => {
    const normalizedNeighborhood = normalizeNeighborhood(neighborhood, index);

    if (!normalizedNeighborhood) {
      return;
    }

    const key = `${normalizedNeighborhood.regionName}-${normalizedNeighborhood.name}`;

    if (!neighborhoodMap.has(key)) {
      neighborhoodMap.set(key, normalizedNeighborhood);
    }
  });

  return Array.from(neighborhoodMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "tr-TR")
  );
}

function normalizeSummary(summary, regionId) {
  if (!summary) {
    return null;
  }

  return {
    regionId: summary.regionId ?? summary.id ?? Number(regionId),

    regionName:
      summary.regionName ??
      summary.name ??
      summary.districtName ??
      summary.ilceAdi ??
      "Bölge",

    chargingStationCount:
      summary.chargingStationCount ??
      summary.stationCount ??
      summary.totalStationCount ??
      0,

    trafficLevel:
      summary.trafficLevel ??
      summary.trafficDensity ??
      summary.trafikYogunlugu ??
      "Veri Eksik",

    mostCommonSocketType:
      summary.mostCommonSocketType ??
      summary.socketType ??
      summary.connectorType ??
      "",

    mostCommonPowerKw:
      summary.mostCommonPowerKw ??
      summary.powerKw ??
      summary.averagePowerKw ??
      null,

    companyDistribution: Array.isArray(summary.companyDistribution)
      ? summary.companyDistribution.map((company, index) => ({
          companyName:
            company.companyName ??
            company.name ??
            `Firma ${index + 1}`,
          stationCount: company.stationCount ?? company.count ?? 0
        }))
      : []
  };
}

async function getRegionsFromApi() {
  const response = await fetch(`${API_BASE_URL}/api/regions`, {
    headers: getAuthHeaders()
  });

  notifyUnauthorized(response, `${API_BASE_URL}/api/regions`);

  if (!response.ok) {
    throw new Error(`Bölge isteği başarısız oldu: ${response.status}`);
  }

  const result = await response.json();
  const regionArray = extractArray(result);

  if (!regionArray) {
    throw new Error("Bölge sunucusu yanıtı geçersiz.");
  }

  return normalizeRegions(regionArray);
}

async function getRegionsFromLocalGeoJson() {
  const response = await fetch(LOCAL_MAHALLE_URL);

  if (!response.ok) {
    throw new Error("Yerel MAHALLE.geojson dosyası yüklenemedi.");
  }

  const result = await response.json();
  const regionArray = extractArray(result);

  if (!regionArray) {
    throw new Error("Yerel MAHALLE.geojson yanıtı geçersiz.");
  }

  return normalizeRegions(regionArray);
}

async function getNeighborhoodsFromApi() {
  const response = await fetch(`${API_BASE_URL}/api/neighborhoods`, {
    headers: getAuthHeaders()
  });

  notifyUnauthorized(response, `${API_BASE_URL}/api/neighborhoods`);

  if (!response.ok) {
    throw new Error(`Mahalle isteği başarısız oldu: ${response.status}`);
  }

  const result = await response.json();
  const neighborhoodArray = extractArray(result);

  if (!neighborhoodArray) {
    throw new Error("Mahalle sunucusu yanıtı geçersiz.");
  }

  return normalizeNeighborhoods(neighborhoodArray);
}

async function getNeighborhoodsFromLocalGeoJson() {
  const response = await fetch(LOCAL_MAHALLE_URL);

  if (!response.ok) {
    throw new Error("Yerel MAHALLE.geojson dosyası yüklenemedi.");
  }

  const result = await response.json();
  const neighborhoodArray = extractArray(result);

  if (!neighborhoodArray) {
    throw new Error("Yerel MAHALLE.geojson yanıtı geçersiz.");
  }

  return normalizeNeighborhoods(neighborhoodArray);
}

export async function getRegions() {
  try {
    const apiRegions = await getRegionsFromApi();

    const hasAllOption = apiRegions.some(
      (region) => region.id === 0 || region.name === "Tümü"
    );

    return {
      data: hasAllOption ? apiRegions : [allRegionOption, ...apiRegions],
      source: "api"
    };
  } catch {
    try {
      const localRegions = await getRegionsFromLocalGeoJson();

      const hasAllOption = localRegions.some(
        (region) => region.id === 0 || region.name === "Tümü"
      );

      return {
        data: hasAllOption ? localRegions : [allRegionOption, ...localRegions],
        source: "local-geojson"
      };
    } catch {
      return {
        data: fallbackRegions,
        source: "local-mock"
      };
    }
  }
}

export async function getNeighborhoods() {
  try {
    const apiNeighborhoods = await getNeighborhoodsFromApi();

    return {
      data: apiNeighborhoods,
      source: "api"
    };
  } catch {
    try {
      const localNeighborhoods = await getNeighborhoodsFromLocalGeoJson();

      if (localNeighborhoods.length > 0) {
        return {
          data: localNeighborhoods,
          source: "local-geojson"
        };
      }

      return {
        data: fallbackNeighborhoods,
        source: "local-mock"
      };
    } catch {
      return {
        data: fallbackNeighborhoods,
        source: "local-mock"
      };
    }
  }
}

export async function getRegionSummary(regionId) {
  if (!regionId || Number(regionId) === 0) {
    return {
      data: null,
      source: "none"
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/regions/${regionId}/summary`, {
      headers: getAuthHeaders()
    });

    notifyUnauthorized(response, `${API_BASE_URL}/api/regions/${regionId}/summary`);

    if (!response.ok) {
      throw new Error(`Bölge özeti isteği başarısız oldu: ${response.status}`);
    }

    const result = await response.json();
    const summaryObject = extractObject(result);

    if (!summaryObject) {
      throw new Error("Bölge özeti yanıtı geçersiz.");
    }

    return {
      data: normalizeSummary(summaryObject, regionId),
      source: "api"
    };
  } catch {
    return {
      data: normalizeSummary(fallbackRegionSummaries[Number(regionId)], regionId),
      source: "local-mock"
    };
  }
}
