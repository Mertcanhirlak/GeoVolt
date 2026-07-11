const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5000"
).trim();

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const LOCAL_MAHALLE_URL = "/data/MAHALLE.geojson";

const REQUEST_TIMEOUT_MS = 15000;

const allRegionOption = {
  id: 0,
  name: "Tümü",
  boundaryGeoJson: "",
};

let localNeighborhoodPromise = null;

const REGION_ID_FIELDS = [
  "regionId",
  "RegionId",
  "REGION_ID",
  "region_id",
  "parentRegionId",
  "ParentRegionId",
  "PARENT_REGION_ID",
  "parent_region_id",
  "semtId",
  "SemtId",
  "SEMT_ID",
  "semt_id",
  "districtId",
  "DistrictId",
  "DISTRICT_ID",
  "district_id",
  "ilceId",
  "IlceId",
  "ILCE_ID",
  "ilce_id",
  "bolgeId",
  "BolgeId",
  "BOLGE_ID",
  "bolge_id",
];

const REGION_NAME_FIELDS = [
  "regionName",
  "RegionName",
  "REGION_NAME",
  "region_name",
  "parentRegionName",
  "ParentRegionName",
  "PARENT_REGION_NAME",
  "parent_region_name",
  "semt",
  "Semt",
  "SEMT",
  "semtAdi",
  "SemtAdi",
  "SEMT_ADI",
  "semt_adi",
  "district",
  "District",
  "DISTRICT",
  "districtName",
  "DistrictName",
  "DISTRICT_NAME",
  "district_name",
  "ilce",
  "Ilce",
  "ILCE",
  "ilçe",
  "İlçe",
  "İLÇE",
  "ilceAdi",
  "IlceAdi",
  "ILCE_ADI",
  "ilce_adi",
  "bolge",
  "Bolge",
  "BOLGE",
  "bölge",
  "Bölge",
  "BÖLGE",
  "bolgeAdi",
  "BolgeAdi",
  "BOLGE_ADI",
  "bolge_adi",
];

const NEIGHBORHOOD_ID_FIELDS = [
  "id",
  "Id",
  "ID",
  "neighborhoodId",
  "NeighborhoodId",
  "NEIGHBORHOOD_ID",
  "neighborhood_id",
  "mahalleId",
  "MahalleId",
  "MAHALLE_ID",
  "mahalle_id",
  "objectId",
  "ObjectId",
  "OBJECTID",
  "object_id",
  "gid",
  "GID",
  "fid",
  "FID",
];

const NEIGHBORHOOD_NAME_FIELDS = [
  "name",
  "Name",
  "NAME",
  "neighborhood",
  "Neighborhood",
  "NEIGHBORHOOD",
  "neighborhoodName",
  "NeighborhoodName",
  "NEIGHBORHOOD_NAME",
  "neighborhood_name",
  "mahalle",
  "Mahalle",
  "MAHALLE",
  "mahalleAdi",
  "MahalleAdi",
  "MAHALLE_ADI",
  "mahalle_adi",
  "mahAdi",
  "MahAdi",
  "MAH_ADI",
  "mah_adi",
  "mahName",
  "MahName",
  "MAH_NAME",
  "mah_name",
  "adm4_tr",
  "ADM4_TR",
];

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
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
    .replace(/(mahallesi|mahalle|mah|mh)$/g, "")
    .replace(/(ilcesi|ilce|semt|bolgesi|bolge)$/g, "");
}

function normalizePropertyKey(value) {
  return normalizeTextKey(value);
}

function hasValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== ""
  );
}

function getProperty(source, propertyNames) {
  if (!source || typeof source !== "object") {
    return null;
  }

  for (const propertyName of propertyNames) {
    if (hasValue(source[propertyName])) {
      return source[propertyName];
    }
  }

  const normalizedPropertyNames = new Set(
    propertyNames.map((propertyName) =>
      normalizePropertyKey(propertyName)
    )
  );

  for (const [key, value] of Object.entries(source)) {
    if (
      hasValue(value) &&
      normalizedPropertyNames.has(
        normalizePropertyKey(key)
      )
    ) {
      return value;
    }
  }

  return null;
}

function getStorageToken(storage) {
  if (!storage) {
    return null;
  }

  const directKeys = [
    "token",
    "accessToken",
    "authToken",
    "jwtToken",
    "geovolt_token",
  ];

  for (const key of directKeys) {
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
      // JSON olmayan storage kayıtları atlanır.
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

function createHeaders(includeAuthorization = true) {
  const token = includeAuthorization
    ? getStoredToken()
    : null;

  return {
    Accept: "application/json",

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function requestJson(
  url,
  {
    includeAuthorization = true,
  } = {}
) {
  const abortController = new AbortController();

  const timeoutId = globalThis.setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      mode: "cors",
      headers: createHeaders(includeAuthorization),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(
        `İstek başarısız oldu. HTTP ${response.status}: ${url}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `İstek zaman aşımına uğradı: ${url}`
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Bağlantı kurulamadı: ${url}`
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
    result?.features,
    result?.data?.items,
    result?.data?.regions,
    result?.data?.neighborhoods,
    result?.data?.features,
    result?.result?.items,
    result?.result?.regions,
    result?.result?.neighborhoods,
    result?.result?.features,
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

function parseNumericId(value, fallbackId = null) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.trunc(value);
  }

  const normalizedValue = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (!normalizedValue) {
    return fallbackId;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue)) {
    return fallbackId;
  }

  return Math.trunc(numericValue);
}

function parsePositiveNumericId(value) {
  const parsedValue = parseNumericId(value);

  return Number.isInteger(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : null;
}

function isUsableName(value) {
  const text = normalizeText(value);

  if (!text) {
    return false;
  }

  return !/^\d+$/.test(text);
}

function getBoundaryGeoJson(item) {
  const directBoundary =
    item?.boundaryGeoJson ??
    item?.BoundaryGeoJson ??
    item?.boundaryGeoJSON ??
    item?.BoundaryGeoJSON ??
    item?.geoJson ??
    item?.GeoJson ??
    item?.geoJSON ??
    item?.GeoJSON;

  if (typeof directBoundary === "string") {
    return directBoundary;
  }

  if (
    directBoundary &&
    typeof directBoundary === "object"
  ) {
    return JSON.stringify(directBoundary);
  }

  if (
    item?.geometry &&
    typeof item.geometry === "object"
  ) {
    return JSON.stringify(item.geometry);
  }

  return "";
}

function formatNeighborhoodName(value) {
  const name = normalizeText(value);

  if (!name) {
    return "";
  }

  const normalizedName = name.toLocaleLowerCase(
    "tr-TR"
  );

  const alreadyContainsSuffix =
    /(?:mahallesi|mahalle|mah\.?|mh\.?)$/i.test(
      normalizedName
    );

  return alreadyContainsSuffix
    ? name
    : `${name} Mahallesi`;
}

function normalizeRegion(region, index) {
  const properties = region?.properties ?? region;

  const rawId = getProperty(properties, [
    "id",
    "Id",
    "ID",
    "regionId",
    "RegionId",
    "REGION_ID",
    "region_id",
    "objectId",
    "ObjectId",
    "OBJECTID",
    "gid",
    "GID",
  ]);

  const name = normalizeText(
    getProperty(properties, [
      "name",
      "Name",
      "NAME",
      "regionName",
      "RegionName",
      "REGION_NAME",
      "region_name",
      "semt",
      "Semt",
      "SEMT",
      "semtAdi",
      "SemtAdi",
      "SEMT_ADI",
      "bolge",
      "Bolge",
      "BOLGE",
      "bolgeAdi",
      "BolgeAdi",
      "BOLGE_ADI",
      "districtName",
      "DistrictName",
      "DISTRICT_NAME",
      "ilceAdi",
      "IlceAdi",
      "ILCE_ADI",
    ])
  );

  if (!isUsableName(name)) {
    return null;
  }

  return {
    id: parseNumericId(rawId, index + 1),
    name,
    boundaryGeoJson: getBoundaryGeoJson(region),
  };
}

function normalizeNeighborhood(
  neighborhood,
  index
) {
  const properties =
    neighborhood?.properties ?? neighborhood;

  const rawId = getProperty(
    properties,
    NEIGHBORHOOD_ID_FIELDS
  );

  const rawName = normalizeText(
    getProperty(
      properties,
      NEIGHBORHOOD_NAME_FIELDS
    )
  );

  if (!isUsableName(rawName)) {
    return null;
  }

  const regionId = parsePositiveNumericId(
    getProperty(properties, REGION_ID_FIELDS)
  );

  const regionName = normalizeText(
    getProperty(properties, REGION_NAME_FIELDS)
  );

  return {
    id: parseNumericId(rawId, index + 1),
    name: formatNeighborhoodName(rawName),
    rawName,
    regionId,
    regionName,
    hasRegionRelation: Boolean(
      regionId || regionName
    ),
    boundaryGeoJson:
      getBoundaryGeoJson(neighborhood),
  };
}

function normalizeRegions(regionArray) {
  const regionMap = new Map();

  regionArray.forEach((region, index) => {
    const normalizedRegion = normalizeRegion(
      region,
      index
    );

    if (
      !normalizedRegion ||
      normalizedRegion.id === 0
    ) {
      return;
    }

    const regionKey = `${normalizedRegion.id}-${normalizeRelationKey(
      normalizedRegion.name
    )}`;

    if (!regionMap.has(regionKey)) {
      regionMap.set(
        regionKey,
        normalizedRegion
      );
    }
  });

  return Array.from(regionMap.values()).sort(
    (firstRegion, secondRegion) =>
      firstRegion.name.localeCompare(
        secondRegion.name,
        "tr-TR"
      )
  );
}

function normalizeNeighborhoods(
  neighborhoodArray
) {
  const neighborhoodMap = new Map();

  neighborhoodArray.forEach(
    (neighborhood, index) => {
      const normalizedNeighborhood =
        normalizeNeighborhood(
          neighborhood,
          index
        );

      if (!normalizedNeighborhood) {
        return;
      }

      const neighborhoodKey =
        `${normalizedNeighborhood.id}-${normalizeRelationKey(
          normalizedNeighborhood.name
        )}-${normalizeRelationKey(
          normalizedNeighborhood.regionName
        )}`;

      if (!neighborhoodMap.has(neighborhoodKey)) {
        neighborhoodMap.set(
          neighborhoodKey,
          normalizedNeighborhood
        );
      }
    }
  );

  return Array.from(
    neighborhoodMap.values()
  ).sort(
    (
      firstNeighborhood,
      secondNeighborhood
    ) =>
      firstNeighborhood.name.localeCompare(
        secondNeighborhood.name,
        "tr-TR"
      )
  );
}

function deriveRegionsFromNeighborhoods(
  neighborhoods
) {
  const regionMap = new Map();

  neighborhoods.forEach(
    (neighborhood, index) => {
      if (neighborhood.regionName) {
        const regionName =
          normalizeText(neighborhood.regionName);

        const regionId =
          neighborhood.regionId ??
          index + 1;

        const key = `${regionId}-${normalizeRelationKey(
          regionName
        )}`;

        if (!regionMap.has(key)) {
          regionMap.set(key, {
            id: regionId,
            name: regionName,
            boundaryGeoJson: "",
          });
        }

        return;
      }

      const key = `${neighborhood.id}-${normalizeRelationKey(
        neighborhood.name
      )}`;

      if (!regionMap.has(key)) {
        regionMap.set(key, {
          id: neighborhood.id,
          name: neighborhood.rawName,
          boundaryGeoJson:
            neighborhood.boundaryGeoJson,
        });
      }
    }
  );

  return Array.from(regionMap.values()).sort(
    (firstRegion, secondRegion) =>
      firstRegion.name.localeCompare(
        secondRegion.name,
        "tr-TR"
      )
  );
}

function neighborhoodMatchesRegion(
  neighborhood,
  regionId,
  regionName = ""
) {
  const numericRegionId =
    parsePositiveNumericId(regionId);

  const normalizedRegionName =
    normalizeRelationKey(regionName);

  if (
    numericRegionId &&
    neighborhood.regionId &&
    String(neighborhood.regionId) ===
      String(numericRegionId)
  ) {
    return true;
  }

  if (
    normalizedRegionName &&
    neighborhood.regionName &&
    normalizeRelationKey(
      neighborhood.regionName
    ) === normalizedRegionName
  ) {
    return true;
  }

  /*
   * Haritada seçilen polygon doğrudan bir mahalle polygonuysa,
   * seçilen bölge adı ile mahalle adının eşleşmesine izin verir.
   *
   * Örnek:
   * Bölge: Yakupabdal
   * Mahalle: Yakupabdal Mahallesi
   */
  if (
    normalizedRegionName &&
    (
      normalizeRelationKey(neighborhood.name) ===
        normalizedRegionName ||
      normalizeRelationKey(neighborhood.rawName) ===
        normalizedRegionName
    )
  ) {
    return true;
  }

  return false;
}

function filterNeighborhoodsByRegion(
  neighborhoods,
  regionId,
  regionName = ""
) {
  return neighborhoods.filter((neighborhood) =>
    neighborhoodMatchesRegion(
      neighborhood,
      regionId,
      regionName
    )
  );
}

function normalizeSummary(summary, regionId) {
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
      "Veri bulunamadı",

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

    companyDistribution: Array.isArray(
      summary.companyDistribution
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
          })
        )
      : [],
  };
}

async function getRegionsFromApi() {
  const result = await requestJson(
    `${API_BASE_URL}/api/regions`
  );

  const regionArray = extractArray(result);

  if (!regionArray) {
    throw new Error(
      "Regions API cevabı geçerli değil."
    );
  }

  return normalizeRegions(regionArray);
}

async function loadLocalNeighborhoods() {
  if (!localNeighborhoodPromise) {
    localNeighborhoodPromise = requestJson(
      LOCAL_MAHALLE_URL,
      {
        includeAuthorization: false,
      }
    )
      .then((result) => {
        const neighborhoodArray =
          extractArray(result);

        if (!neighborhoodArray) {
          throw new Error(
            "MAHALLE.geojson içinde geçerli feature listesi bulunamadı."
          );
        }

        return normalizeNeighborhoods(
          neighborhoodArray
        );
      })
      .catch((error) => {
        localNeighborhoodPromise = null;
        throw error;
      });
  }

  return localNeighborhoodPromise;
}

async function getRegionsFromLocalGeoJson() {
  const localNeighborhoods =
    await loadLocalNeighborhoods();

  return deriveRegionsFromNeighborhoods(
    localNeighborhoods
  );
}

export async function getRegions() {
  try {
    const apiRegions =
      await getRegionsFromApi();

    return {
      data: [
        allRegionOption,
        ...apiRegions,
      ],
      source: "api",
      error: null,
    };
  } catch (apiError) {
    console.warn(
      "Bölgeler API'den alınamadı. Yerel GeoJSON kullanılacak:",
      apiError
    );

    try {
      const localRegions =
        await getRegionsFromLocalGeoJson();

      return {
        data: [
          allRegionOption,
          ...localRegions,
        ],
        source: "local-geojson",
        error: null,
      };
    } catch (localError) {
      console.error(
        "Yerel bölge verileri alınamadı:",
        localError
      );

      return {
        data: [allRegionOption],
        source: "none",
        error:
          "Bölge verileri alınamadı.",
      };
    }
  }
}

export async function getNeighborhoods(
  regionId = null,
  regionName = ""
) {
  const numericRegionId =
    parsePositiveNumericId(regionId);

  const safeRegionName =
    normalizeText(regionName);

  if (!numericRegionId && !safeRegionName) {
    return {
      data: [],
      source: "validation",
      error:
        "Mahalleleri getirmek için önce bir bölge seçilmelidir.",
      message: "",
    };
  }

  try {
    const localNeighborhoods =
      await loadLocalNeighborhoods();

    const filteredNeighborhoods =
      filterNeighborhoodsByRegion(
        localNeighborhoods,
        numericRegionId,
        safeRegionName
      );

    if (filteredNeighborhoods.length > 0) {
      return {
        data: filteredNeighborhoods,
        source: "local-geojson-filtered",
        error: null,
        message:
          `${filteredNeighborhoods.length} gerçek mahalle eşleşmesi bulundu.`,
      };
    }

    return {
      data: [],
      source: "local-geojson-filtered",
      error: null,
      message:
        "Seçilen bölge için MAHALLE.geojson içinde doğrulanmış mahalle eşleşmesi bulunamadı.",
    };
  } catch (error) {
    console.error(
      "Yerel mahalle verileri alınamadı:",
      error
    );

    return {
      data: [],
      source: "none",
      error:
        "MAHALLE.geojson dosyasından mahalle verileri alınamadı.",
      message: "",
    };
  }
}

export async function getRegionSummary(
  regionId
) {
  const numericRegionId = Number(regionId);

  if (
    !Number.isInteger(numericRegionId) ||
    numericRegionId <= 0
  ) {
    return {
      data: null,
      source: "none",
    };
  }

  try {
    const result = await requestJson(
      `${API_BASE_URL}/api/regions/${numericRegionId}/summary`
    );

    const summaryObject =
      extractObject(result);

    return {
      data: normalizeSummary(
        summaryObject,
        numericRegionId
      ),
      source: "api",
    };
  } catch (error) {
    console.warn(
      "Bölge özeti alınamadı:",
      error
    );

    return {
      data: null,
      source: "none",
    };
  }
}