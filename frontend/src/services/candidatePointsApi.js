import {
  mapCandidatePoint,
  mapCandidatePoints,
} from "../utils/candidatePointMapper";

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5000",
).trim();

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const CANDIDATE_POINTS_API_ENABLED =
  String(
    import.meta.env
      .VITE_ENABLE_CANDIDATE_POINTS_API ??
      "true",
  )
    .trim()
    .toLocaleLowerCase("tr-TR") !==
  "false";

const CANDIDATE_POINTS_ENDPOINT =
  "/api/candidate-points";

const REQUEST_TIMEOUT_MS = 15000;

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

  const objectKeys = [
    "auth",
    "user",
    "authUser",
    "geovolt-auth",
    "auth-storage",
  ];

  for (const key of objectKeys) {
    const value = storage.getItem(key);

    if (!value) {
      continue;
    }

    try {
      const parsedValue =
        JSON.parse(value);

      const token =
        parsedValue?.token ??
        parsedValue?.accessToken ??
        parsedValue?.authToken ??
        parsedValue?.jwtToken ??
        parsedValue?.state?.token ??
        parsedValue?.state
          ?.accessToken;

      if (token) {
        return String(token).trim();
      }
    } catch {
      // JSON olmayan kayıtlar atlanır.
    }
  }

  return null;
}

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    getStorageToken(
      window.localStorage,
    ) ??
    getStorageToken(
      window.sessionStorage,
    )
  );
}

function createApiUrl(
  path,
  queryParameters = {},
) {
  const query = new URLSearchParams();

  Object.entries(queryParameters).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        query.set(key, String(value));
      }
    },
  );

  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  const queryString =
    query.toString();

  const url = `${API_BASE_URL}${normalizedPath}`;

  return queryString
    ? `${url}?${queryString}`
    : url;
}

function extractCandidateList(
  responseBody,
) {
  if (Array.isArray(responseBody)) {
    return responseBody;
  }

  if (
    !responseBody ||
    typeof responseBody !== "object"
  ) {
    return null;
  }

  const directCandidates = [
    responseBody.data,
    responseBody.items,
    responseBody.result,
    responseBody.results,
    responseBody.value,
    responseBody.candidatePoints,
    responseBody.candidates,
  ];

  for (
    const candidateValue
    of directCandidates
  ) {
    if (
      Array.isArray(candidateValue)
    ) {
      return candidateValue;
    }
  }

  const nestedContainers = [
    responseBody.data,
    responseBody.result,
    responseBody.value,
  ];

  for (
    const container
    of nestedContainers
  ) {
    if (
      !container ||
      typeof container !== "object"
    ) {
      continue;
    }

    const nestedCandidates = [
      container.items,
      container.data,
      container.results,
      container.candidatePoints,
      container.candidates,
    ];

    for (
      const candidateValue
      of nestedCandidates
    ) {
      if (
        Array.isArray(candidateValue)
      ) {
        return candidateValue;
      }
    }
  }

  return null;
}

function extractResponseMessage(
  responseBody,
) {
  if (
    !responseBody ||
    typeof responseBody !== "object"
  ) {
    return "";
  }

  return String(
    responseBody.message ??
      responseBody.Message ??
      responseBody.title ??
      "",
  ).trim();
}

async function readResponseBody(
  response,
) {
  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

async function requestJson(
  url,
  options = {},
) {
  const abortController =
    new AbortController();

  const timeoutId =
    globalThis.setTimeout(() => {
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);

  const token = getStoredToken();

  try {
    const response = await fetch(url, {
      ...options,

      mode: "cors",

      headers: {
        Accept: "application/json",

        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),

        ...options.headers,
      },

      signal:
        abortController.signal,
    });

    const responseBody =
      await readResponseBody(
        response,
      );

    if (!response.ok) {
      const serverMessage =
        typeof responseBody ===
        "object"
          ? responseBody?.message ??
            responseBody?.Message ??
            responseBody?.title
          : null;

      throw new Error(
        serverMessage ||
          `Aday nokta isteği başarısız oldu. HTTP ${response.status}`,
      );
    }

    return responseBody;
  } catch (error) {
    if (
      error?.name === "AbortError"
    ) {
      throw new Error(
        "Aday nokta isteği zaman aşımına uğradı.",
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Aday nokta backend bağlantısı kurulamadı. Adres: ${url}`,
      );
    }

    throw error;
  } finally {
    globalThis.clearTimeout(
      timeoutId,
    );
  }
}

function createCandidateQuery(
  filters = {},
) {
  return {
    regionId:
      filters.regionId,

    neighborhoodId:
      filters.neighborhoodId,

    minCostScore:
      filters.minCostScore ??
      filters.costMin,

    maxCostScore:
      filters.maxCostScore ??
      filters.costMax,

    minDemandScore:
      filters.minDemandScore ??
      filters.demandMin,

    maxDemandScore:
      filters.maxDemandScore ??
      filters.demandMax,

    minGeneralScore:
      filters.minGeneralScore ??
      filters.generalMin,

    maxGeneralScore:
      filters.maxGeneralScore ??
      filters.generalMax,

    systemType:
      filters.systemType,

    placeType:
      filters.placeType,

    minBudget:
      filters.minBudget ??
      filters.budgetMin,

    maxBudget:
      filters.maxBudget ??
      filters.budgetMax,

    onlyOptimal:
      filters.onlyOptimal,
  };
}

export async function getCandidatePoints(
  filters = {},
) {
  if (
    !CANDIDATE_POINTS_API_ENABLED
  ) {
    return {
      data: [],
      source: "disabled",
      error: null,

      message:
        "Gerçek aday backend'i henüz aktif değil. Demo adaylar gösterilmiyor.",

      isRealData: false,
    };
  }

  const query =
    createCandidateQuery(filters);

  const url = createApiUrl(
    CANDIDATE_POINTS_ENDPOINT,
    query,
  );

  try {
    const responseBody =
      await requestJson(url);

    const rawCandidates =
      extractCandidateList(
        responseBody,
      );

    if (
      !Array.isArray(
        rawCandidates,
      )
    ) {
      throw new Error(
        "Aday nokta API cevabında geçerli bir liste bulunamadı.",
      );
    }

    const candidates =
      mapCandidatePoints(
        rawCandidates,
      );

    return {
      data: candidates,
      source: "api",
      error: null,

      message:
        extractResponseMessage(
          responseBody,
        ) ||
        `${candidates.length} aday nokta getirildi.`,

      isRealData: true,
    };
  } catch (error) {
    console.warn(
      "Gerçek aday nokta verisi alınamadı:",
      error,
    );

    return {
      data: [],
      source: "unavailable",

      error:
        error instanceof Error
          ? error.message
          : "Gerçek aday nokta verisi alınamadı.",

      message: "",
      isRealData: false,
    };
  }
}

function normalizeRegionMatchValue(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(mahallesi|mahalle|mah|mh|bolgesi|bolge)$/g, "");
}

function getRegionRecordId(region) {
  const value =
    region?.id ??
    region?.Id ??
    region?.ID ??
    region?.regionId ??
    region?.RegionId;

  const numericValue = Number(value);

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

function collectRegionIds(region, fallbackRegionId) {
  const ids = new Set();

  const addId = (value) => {
    const numericValue = Number(value);

    if (Number.isInteger(numericValue) && numericValue > 0) {
      ids.add(numericValue);
    }
  };

  addId(fallbackRegionId);
  addId(getRegionRecordId(region));

  [
    ...(Array.isArray(region?.regionIds) ? region.regionIds : []),
    ...(Array.isArray(region?.RegionIds) ? region.RegionIds : []),
  ].forEach(addId);

  const sourceRegions = [
    ...(Array.isArray(region?.sourceRegions) ? region.sourceRegions : []),
    ...(Array.isArray(region?.SourceRegions) ? region.SourceRegions : []),
  ];

  sourceRegions.forEach((sourceRegion) => {
    addId(getRegionRecordId(sourceRegion));
  });

  return ids;
}

function getRegionBoundaryValue(region) {
  const possibleValues = [
    region?.boundaryGeoJson,
    region?.boundaryGeoJSON,
    region?.BoundaryGeoJson,
    region?.BoundaryGeoJSON,
    region?.boundary,
    region?.Boundary,
    region?.geometry,
    region?.Geometry,
    region?.geoJson,
    region?.geoJSON,
    region?.GeoJson,
    region?.GeoJSON,
  ];

  for (const value of possibleValues) {
    if (!value) {
      continue;
    }

    if (typeof value === "object") {
      return value;
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        // Geçersiz GeoJSON değeri atlanır.
      }
    }
  }

  return null;
}

function collectRegionGeometries(region) {
  const geometries = [];

  const visit = (value) => {
    if (!value || typeof value !== "object") {
      return;
    }

    if (value.type === "FeatureCollection") {
      (value.features ?? []).forEach(visit);
      return;
    }

    if (value.type === "Feature") {
      visit(value.geometry);
      return;
    }

    if (value.type === "GeometryCollection") {
      (value.geometries ?? []).forEach(visit);
      return;
    }

    if (value.type === "Polygon" || value.type === "MultiPolygon") {
      geometries.push(value);
    }
  };

  visit(getRegionBoundaryValue(region));

  const sourceRegions = [
    ...(Array.isArray(region?.sourceRegions) ? region.sourceRegions : []),
    ...(Array.isArray(region?.SourceRegions) ? region.SourceRegions : []),
  ];

  sourceRegions.forEach((sourceRegion) => {
    visit(getRegionBoundaryValue(sourceRegion));
  });

  return geometries;
}

function isCoordinatePair(value) {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }

  const longitude = Number(value[0]);
  const latitude = Number(value[1]);

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function isPointInsideRing(longitude, latitude, ring) {
  if (
    !Array.isArray(ring) ||
    ring.length < 4 ||
    !ring.every(isCoordinatePair)
  ) {
    return false;
  }

  let inside = false;

  for (
    let index = 0, previousIndex = ring.length - 1;
    index < ring.length;
    previousIndex = index++
  ) {
    const currentLongitude = Number(ring[index][0]);
    const currentLatitude = Number(ring[index][1]);
    const previousLongitude = Number(ring[previousIndex][0]);
    const previousLatitude = Number(ring[previousIndex][1]);

    const crossesLatitude =
      currentLatitude > latitude !== previousLatitude > latitude;

    if (!crossesLatitude) {
      continue;
    }

    const intersectionLongitude =
      ((previousLongitude - currentLongitude) *
        (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude || Number.EPSILON) +
      currentLongitude;

    if (longitude < intersectionLongitude) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInsidePolygon(longitude, latitude, polygonCoordinates) {
  if (
    !Array.isArray(polygonCoordinates) ||
    polygonCoordinates.length === 0 ||
    !isPointInsideRing(longitude, latitude, polygonCoordinates[0])
  ) {
    return false;
  }

  return !polygonCoordinates
    .slice(1)
    .some((holeRing) => isPointInsideRing(longitude, latitude, holeRing));
}

function isPointInsideGeometry(longitude, latitude, geometry) {
  if (geometry?.type === "Polygon") {
    return isPointInsidePolygon(longitude, latitude, geometry.coordinates);
  }

  if (geometry?.type === "MultiPolygon") {
    return (geometry.coordinates ?? []).some((polygonCoordinates) =>
      isPointInsidePolygon(longitude, latitude, polygonCoordinates),
    );
  }

  return false;
}

function candidateMatchesSelectedRegion(candidate, regionContext) {
  const candidateLatitude = Number(candidate?.latitude);
  const candidateLongitude = Number(candidate?.longitude);

  const candidateRegionId = Number(candidate?.regionId);
  const idMatches =
    Number.isInteger(candidateRegionId) &&
    candidateRegionId > 0 &&
    regionContext.regionIds.has(candidateRegionId);

  const candidateLocationValues = [
    candidate?.region,
    candidate?.regionName,
    candidate?.neighborhood,
    candidate?.neighborhoodName,
    candidate?.estimatedAddress,
  ]
    .map(normalizeRegionMatchValue)
    .filter(Boolean);

  const nameMatches =
    Boolean(regionContext.normalizedRegionName) &&
    candidateLocationValues.some(
      (value) =>
        value === regionContext.normalizedRegionName ||
        value.includes(regionContext.normalizedRegionName) ||
        regionContext.normalizedRegionName.includes(value),
    );

  const geometryMatches =
    Number.isFinite(candidateLatitude) &&
    Number.isFinite(candidateLongitude) &&
    regionContext.geometries.some((geometry) =>
      isPointInsideGeometry(
        candidateLongitude,
        candidateLatitude,
        geometry,
      ),
    );

  return idMatches || nameMatches || geometryMatches;
}

function createRegionContext(regionId, regionName, region) {
  return {
    regionIds: collectRegionIds(region, regionId),
    normalizedRegionName: normalizeRegionMatchValue(
      regionName ??
        region?.name ??
        region?.Name ??
        region?.regionName ??
        region?.RegionName,
    ),
    geometries: collectRegionGeometries(region),
  };
}

export async function scanCandidatePointsByRegion(
  regionId,
  filtersOrMinimumScore = {},
  legacyAdditionalFilters = {},
) {
  const numericRegionId = Number(regionId);

  if (!Number.isInteger(numericRegionId) || numericRegionId <= 0) {
    return {
      data: [],
      source: "validation",
      error: "Bölgeyi taramak için geçerli bir bölge seçmelisiniz.",
      message: "",
      isRealData: false,
      regionId: null,
    };
  }

  if (!CANDIDATE_POINTS_API_ENABLED) {
    return {
      data: [],
      source: "disabled",
      error: null,
      message:
        "Gerçek aday backend'i henüz aktif değil. Demo sonuç gerçek tarama sonucu gibi gösterilmiyor.",
      isRealData: false,
      regionId: numericRegionId,
    };
  }

  const additionalFilters =
    filtersOrMinimumScore &&
    typeof filtersOrMinimumScore === "object" &&
    !Array.isArray(filtersOrMinimumScore)
      ? filtersOrMinimumScore
      : legacyAdditionalFilters;

  const {
    regionName,
    region,
    minGeneralScore: ignoredMinGeneralScore,
    generalMin: ignoredGeneralMin,
    ...requestFilters
  } = additionalFilters ?? {};

  void ignoredMinGeneralScore;
  void ignoredGeneralMin;

  const regionContext = createRegionContext(
    numericRegionId,
    regionName,
    region,
  );

  const regionResult = await getCandidatePoints({
    ...requestFilters,
    regionId: numericRegionId,
  });

  if (!regionResult.isRealData) {
    return {
      ...regionResult,
      regionId: numericRegionId,
    };
  }

  const regionResponseCandidates = Array.isArray(regionResult.data)
    ? regionResult.data
    : [];

  /*
   * Backend regionId parametresini yok sayarsa bütün adayları döndürebilir.
   * Bu nedenle cevabı hiçbir koşulda doğrudan güvenilir kabul etmiyoruz.
   * Her aday seçili bölgenin id/ad/polygon bilgisiyle doğrulanır.
   */
  let verifiedCandidates = regionResponseCandidates.filter((candidate) =>
    candidateMatchesSelectedRegion(candidate, regionContext),
  );

  let requestMode = "region-query-strict";
  let totalCandidateCount = regionResponseCandidates.length;

  if (verifiedCandidates.length === 0) {
    const allCandidatesResult = await getCandidatePoints(requestFilters);

    if (!allCandidatesResult.isRealData) {
      return {
        ...allCandidatesResult,
        regionId: numericRegionId,
      };
    }

    const allCandidates = Array.isArray(allCandidatesResult.data)
      ? allCandidatesResult.data
      : [];

    totalCandidateCount = allCandidates.length;
    verifiedCandidates = allCandidates.filter((candidate) =>
      candidateMatchesSelectedRegion(candidate, regionContext),
    );
    requestMode = "all-candidates-strict-spatial-filter";
  }

  const isFiniteValue = (value) =>
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value));

  const completeCandidates = verifiedCandidates.filter(
    (candidate) =>
      isFiniteValue(candidate?.estimatedCost) &&
      isFiniteValue(candidate?.costScore) &&
      isFiniteValue(candidate?.demandScore) &&
      isFiniteValue(candidate?.generalScore) &&
      isFiniteValue(candidate?.latitude) &&
      isFiniteValue(candidate?.longitude),
  );

  const incompleteCandidateCount =
    verifiedCandidates.length - completeCandidates.length;

  let message = "";

  if (completeCandidates.length > 0 && incompleteCandidateCount > 0) {
    message = `${completeCandidates.length} tam hesaplanmış aday gösterildi. ${incompleteCandidateCount} adayın maliyet veya skor alanları backend cevabında eksik olduğu için gösterilmedi.`;
  } else if (completeCandidates.length > 0) {
    message = `${completeCandidates.length} tam hesaplanmış bölgesel aday nokta getirildi.`;
  } else if (verifiedCandidates.length > 0) {
    message = `${verifiedCandidates.length} aday seçili bölgeyle eşleşti; ancak tahmini maliyet, maliyet skoru, talep skoru veya genel skor alanları backend cevabında eksik. Frontend gerçek değer uydurmadığı için bu adaylar gösterilmedi.`;
  } else if (totalCandidateCount === 0) {
    message = "Aday nokta endpoint'i boş liste döndürdü.";
  } else {
    message = "Backend aday listesini döndürdü; ancak seçili bölgeye ait doğrulanmış aday bulunamadı. RegionId filtresi backend tarafından uygulanmıyor olabilir.";
  }

  return {
    ...regionResult,
    data: completeCandidates,
    message,
    regionId: numericRegionId,
    requestMode,
    totalCandidateCount,
    matchedCandidateCount: verifiedCandidates.length,
    incompleteCandidateCount,
  };
}

export async function getCandidatePointById(
  candidatePointId,
) {
  const result =
    await getCandidatePoints();

  const candidate =
    result.data.find(
      (item) =>
        String(item.id) ===
        String(candidatePointId),
    );

  return {
    ...result,
    data:
      candidate ?? null,
  };
}

export async function getCandidatePointsByRegion(
  regionId,
  additionalFilters = {},
) {
  return getCandidatePoints({
    ...additionalFilters,
    regionId,
  });
}

export function normalizeCandidatePoint(
  candidatePoint,
) {
  return mapCandidatePoint(
    candidatePoint,
  );
}