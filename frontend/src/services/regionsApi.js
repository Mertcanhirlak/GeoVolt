const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000",
).trim();

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const REQUEST_TIMEOUT_MS = 15000;

const allRegionOption = {
  id: 0,
  name: "Tümü",
  population: 0,
  boundaryGeoJson: "",
};

function getStorageToken(storage) {
  if (!storage) {
    return null;
  }

  const directTokenKeys = [
    "token",
    "accessToken",
    "authToken",
    "jwtToken",
    "geovolt_token",
  ];

  for (const key of directTokenKeys) {
    const value = storage.getItem(key);

    if (value && value.trim()) {
      return value
        .replace(/^"|"$/g, "")
        .trim();
    }
  }

  const objectTokenKeys = [
    "auth",
    "user",
    "authUser",
    "geovolt-auth",
    "auth-storage",
  ];

  for (const key of objectTokenKeys) {
    const value = storage.getItem(key);

    if (!value) {
      continue;
    }

    try {
      const parsedValue = JSON.parse(value);

      const token =
        parsedValue?.token ??
        parsedValue?.accessToken ??
        parsedValue?.authToken ??
        parsedValue?.jwtToken ??
        parsedValue?.state?.token ??
        parsedValue?.state?.accessToken;

      if (token) {
        return String(token).trim();
      }
    } catch {
      // JSON olmayan localStorage kayıtları atlanır.
    }
  }

  return null;
}

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    getStorageToken(window.localStorage) ??
    getStorageToken(window.sessionStorage)
  );
}

function createHeaders() {
  const token = getStoredToken();

  return {
    Accept: "application/json",

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function requestJson(url) {
  const abortController = new AbortController();

  const timeoutId = globalThis.setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: createHeaders(),
      signal: abortController.signal,
    });

    if (response.status === 401) {
      throw new Error(
        "Bu veriyi görüntülemek için yeniden giriş yapmalısınız.",
      );
    }

    if (response.status === 403) {
      throw new Error(
        "Bu veriyi görüntülemek için yetkiniz bulunmuyor.",
      );
    }

    if (!response.ok) {
      throw new Error(
        `API isteği başarısız oldu. HTTP ${response.status}: ${url}`,
      );
    }

    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `API isteği zaman aşımına uğradı: ${url}`,
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Backend bağlantısı kurulamadı: ${url}`,
      );
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function extractArray(result) {
  if (Array.isArray(result)) {
    return result;
  }

  const possibleArrays = [
    result?.data,
    result?.items,
    result?.result,
    result?.value,
    result?.regions,
    result?.neighborhoods,
    result?.data?.items,
    result?.data?.regions,
    result?.data?.neighborhoods,
    result?.result?.items,
    result?.result?.regions,
    result?.result?.neighborhoods,
  ];

  for (const possibleArray of possibleArrays) {
    if (Array.isArray(possibleArray)) {
      return possibleArray;
    }
  }

  return null;
}

function extractObject(result) {
  if (!result) {
    return null;
  }

  if (
    result.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data)
  ) {
    return result.data;
  }

  if (
    result.result &&
    typeof result.result === "object" &&
    !Array.isArray(result.result)
  ) {
    return result.result;
  }

  return result;
}

function getProperty(source, propertyNames) {
  for (const propertyName of propertyNames) {
    const value = source?.[propertyName];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeTextKey(value) {
  return normalizeText(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeRelationKey(value) {
  return normalizeTextKey(value)
    .replace(
      /(mahallesi|mahalle|mah|mh)$/g,
      "",
    )
    .replace(
      /(ilcesi|ilce|semt|bolgesi|bolge)$/g,
      "",
    );
}

function parsePositiveInteger(value) {
  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

function parseNumberOrDefault(value, defaultValue = 0) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : defaultValue;
}

function isUsableName(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return false;
  }

  return !/^\d+$/.test(normalizedValue);
}

function getBoundaryGeoJson(item) {
  const boundary =
    item?.boundaryGeoJson ??
    item?.BoundaryGeoJson ??
    item?.boundaryGeoJSON ??
    item?.BoundaryGeoJSON ??
    item?.geoJson ??
    item?.GeoJson ??
    item?.geometry ??
    item?.Geometry;

  if (typeof boundary === "string") {
    return boundary;
  }

  if (
    boundary &&
    typeof boundary === "object"
  ) {
    return JSON.stringify(boundary);
  }

  return "";
}

function formatNeighborhoodName(value) {
  const name = normalizeText(value);

  if (!name) {
    return "";
  }

  const normalizedName =
    name.toLocaleLowerCase("tr-TR");

  if (
    normalizedName.includes("mahallesi") ||
    normalizedName.includes("mahalle")
  ) {
    return name;
  }

  return `${name} Mahallesi`;
}

function normalizeRegion(region, index) {
  const source =
    region?.properties ??
    region;

  const id = parsePositiveInteger(
    getProperty(source, [
      "id",
      "Id",
      "ID",
      "regionId",
      "RegionId",
      "REGION_ID",
      "sourceId",
      "SourceId",
      "SOURCE_ID",
    ]),
  );

  const name = normalizeText(
    getProperty(source, [
      "name",
      "Name",
      "NAME",
      "regionName",
      "RegionName",
      "REGION_NAME",
      "semt",
      "Semt",
      "SEMT",
    ]),
  );

  if (!isUsableName(name)) {
    return null;
  }

  return {
    id: id ?? index + 1,
    name,

    population: parseNumberOrDefault(
      getProperty(source, [
        "population",
        "Population",
        "POPULATION",
        "nufus",
        "Nufus",
        "NUFUS",
      ]),
      0,
    ),

    boundaryGeoJson:
      getBoundaryGeoJson(region),
  };
}

function normalizeNeighborhood(
  neighborhood,
  index,
) {
  const source =
    neighborhood?.properties ??
    neighborhood;

  const id = parsePositiveInteger(
    getProperty(source, [
      "id",
      "Id",
      "ID",
      "neighborhoodId",
      "NeighborhoodId",
      "NEIGHBORHOOD_ID",
      "sourceId",
      "SourceId",
      "SOURCE_ID",
    ]),
  );

  const name = normalizeText(
    getProperty(source, [
      "name",
      "Name",
      "NAME",
      "neighborhood",
      "Neighborhood",
      "neighborhoodName",
      "NeighborhoodName",
      "NEIGHBORHOOD_NAME",
      "mahalle",
      "Mahalle",
      "MAHALLE",
    ]),
  );

  const regionId = parsePositiveInteger(
    getProperty(source, [
      "regionId",
      "RegionId",
      "REGION_ID",
      "parentRegionId",
      "ParentRegionId",
      "PARENT_REGION_ID",
      "semtId",
      "SemtId",
      "SEMT_ID",
    ]),
  );

  const regionName = normalizeText(
    getProperty(source, [
      "regionName",
      "RegionName",
      "REGION_NAME",
      "parentRegionName",
      "ParentRegionName",
      "PARENT_REGION_NAME",
      "semt",
      "Semt",
      "SEMT",
    ]),
  );

  if (!isUsableName(name)) {
    return null;
  }

  return {
    id: id ?? index + 1,

    name:
      formatNeighborhoodName(name),

    regionId,
    regionName,

    population: parseNumberOrDefault(
      getProperty(source, [
        "population",
        "Population",
        "POPULATION",
        "nufus",
        "Nufus",
        "NUFUS",
      ]),
      0,
    ),

    boundaryGeoJson:
      getBoundaryGeoJson(neighborhood),
  };
}

function normalizeRegions(regionArray) {
  const regionMap = new Map();

  regionArray.forEach(
    (region, index) => {
      const normalizedRegion =
        normalizeRegion(region, index);

      if (
        !normalizedRegion ||
        Number(normalizedRegion.id) === 0
      ) {
        return;
      }

      const key =
        String(normalizedRegion.id);

      if (!regionMap.has(key)) {
        regionMap.set(
          key,
          normalizedRegion,
        );
      }
    },
  );

  return Array.from(
    regionMap.values(),
  ).sort((first, second) =>
    first.name.localeCompare(
      second.name,
      "tr-TR",
    ),
  );
}

function normalizeNeighborhoods(
  neighborhoodArray,
) {
  const neighborhoodMap = new Map();

  neighborhoodArray.forEach(
    (neighborhood, index) => {
      const normalizedNeighborhood =
        normalizeNeighborhood(
          neighborhood,
          index,
        );

      if (!normalizedNeighborhood) {
        return;
      }

      const key =
        normalizedNeighborhood.id
          ? String(
              normalizedNeighborhood.id,
            )
          : `${normalizeTextKey(
              normalizedNeighborhood.name,
            )}-${normalizedNeighborhood.regionId ?? "none"}`;

      if (!neighborhoodMap.has(key)) {
        neighborhoodMap.set(
          key,
          normalizedNeighborhood,
        );
      }
    },
  );

  return Array.from(
    neighborhoodMap.values(),
  ).sort((first, second) =>
    first.name.localeCompare(
      second.name,
      "tr-TR",
    ),
  );
}

function filterNeighborhoodsByRegion(
  neighborhoods,
  regionId,
  regionName = "",
) {
  const numericRegionId =
    parsePositiveInteger(regionId);

  const normalizedRegionName =
    normalizeRelationKey(regionName);

  return neighborhoods.filter(
    (neighborhood) => {
      const neighborhoodRegionId =
        parsePositiveInteger(
          neighborhood.regionId,
        );

      if (
        numericRegionId &&
        neighborhoodRegionId
      ) {
        return (
          neighborhoodRegionId ===
          numericRegionId
        );
      }

      if (
        normalizedRegionName &&
        neighborhood.regionName
      ) {
        return (
          normalizeRelationKey(
            neighborhood.regionName,
          ) ===
          normalizedRegionName
        );
      }

      return false;
    },
  );
}

function normalizeSummary(
  summary,
  regionId,
) {
  if (!summary) {
    return null;
  }

  return {
    regionId:
      summary.regionId ??
      summary.RegionId ??
      summary.id ??
      Number(regionId),

    regionName:
      summary.regionName ??
      summary.RegionName ??
      summary.name ??
      "Bölge",

    chargingStationCount:
      summary.chargingStationCount ??
      summary.ChargingStationCount ??
      summary.stationCount ??
      0,

    trafficLevel:
      summary.trafficLevel ??
      summary.TrafficLevel ??
      summary.trafficDensity ??
      "Veri hazırlanıyor",

    mostCommonSocketType:
      summary.mostCommonSocketType ??
      summary.MostCommonSocketType ??
      summary.socketType ??
      "",

    mostCommonPowerKw:
      summary.mostCommonPowerKw ??
      summary.MostCommonPowerKw ??
      summary.powerKw ??
      null,

    companyDistribution:
      Array.isArray(
        summary.companyDistribution,
      )
        ? summary.companyDistribution.map(
            (company, index) => ({
              companyName:
                company.companyName ??
                company.CompanyName ??
                company.name ??
                `Firma ${index + 1}`,

              stationCount:
                company.stationCount ??
                company.StationCount ??
                company.count ??
                0,
            }),
          )
        : [],
  };
}

async function getAllRegionsFromApi() {
  const result = await requestJson(
    `${API_BASE_URL}/api/regions`,
  );

  const regionArray =
    extractArray(result);

  if (!regionArray) {
    throw new Error(
      "Bölge API cevabı geçerli bir liste içermiyor.",
    );
  }

  return normalizeRegions(
    regionArray,
  );
}

async function getAllNeighborhoodsFromApi() {
  const result = await requestJson(
    `${API_BASE_URL}/api/neighborhoods`,
  );

  const neighborhoodArray =
    extractArray(result);

  if (!neighborhoodArray) {
    throw new Error(
      "Mahalle API cevabı geçerli bir liste içermiyor.",
    );
  }

  return normalizeNeighborhoods(
    neighborhoodArray,
  );
}

export async function getRegions() {
  try {
    const regions =
      await getAllRegionsFromApi();

    return {
      data: [
        allRegionOption,
        ...regions,
      ],

      source: "api",
      error: null,
    };
  } catch (error) {
    console.error(
      "Bölgeler API üzerinden alınamadı:",
      error,
    );

    return {
      data: [allRegionOption],
      source: "none",

      error:
        error instanceof Error
          ? error.message
          : "Bölge verileri alınamadı.",
    };
  }
}

export async function getNeighborhoods(
  regionId = null,
  regionName = "",
) {
  const numericRegionId =
    parsePositiveInteger(regionId);

  const safeRegionName =
    normalizeText(regionName);

  if (
    !numericRegionId &&
    !safeRegionName
  ) {
    return {
      data: [],
      source: "validation",
      error: null,

      message:
        "Mahalle seçmek için önce bir bölge seçin.",
    };
  }

  try {
    const allNeighborhoods =
      await getAllNeighborhoodsFromApi();

    const filteredNeighborhoods =
      filterNeighborhoodsByRegion(
        allNeighborhoods,
        numericRegionId,
        safeRegionName,
      );

    if (
      filteredNeighborhoods.length === 0
    ) {
      return {
        data: [],
        source: "api-filtered",
        error: null,

        message:
          "Seçilen bölgeye bağlı mahalle bulunamadı.",
      };
    }

    return {
      data:
        filteredNeighborhoods,

      source: "api-filtered",
      error: null,

      message:
        `${filteredNeighborhoods.length} gerçek mahalle getirildi.`,
    };
  } catch (error) {
    console.error(
      "Mahalleler API üzerinden alınamadı:",
      error,
    );

    return {
      data: [],
      source: "none",

      error:
        error instanceof Error
          ? error.message
          : "Mahalle verileri alınamadı.",

      message: "",
    };
  }
}

export async function getRegionSummary(
  regionId,
) {
  const numericRegionId =
    parsePositiveInteger(regionId);

  if (!numericRegionId) {
    return {
      data: null,
      source: "none",
      error: null,
    };
  }

  try {
    const result = await requestJson(
      `${API_BASE_URL}/api/regions/${numericRegionId}/summary`,
    );

    const summaryObject =
      extractObject(result);

    return {
      data: normalizeSummary(
        summaryObject,
        numericRegionId,
      ),

      source: "api",
      error: null,
    };
  } catch (error) {
    console.warn(
      "Bölge özeti API üzerinden alınamadı:",
      error,
    );

    return {
      data: null,
      source: "none",

      error:
        error instanceof Error
          ? error.message
          : "Bölge özeti alınamadı.",
    };
  }
}