const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5000"
).trim();

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const LOCAL_MAHALLE_URL =
  "/data/MAHALLE.geojson";

const allRegionOption = {
  id: 0,
  name: "Tümü",
  boundaryGeoJson: "",
};

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const storages = [
    window.localStorage,
    window.sessionStorage,
  ];

  const directKeys = [
    "token",
    "accessToken",
    "authToken",
    "jwtToken",
    "geovolt_token",
  ];

  for (const storage of storages) {
    for (const key of directKeys) {
      const value = storage.getItem(key);

      if (value && value.trim()) {
        return value
          .replace(/^"|"$/g, "")
          .trim();
      }
    }
  }

  const objectKeys = [
    "auth",
    "user",
    "authUser",
    "geovolt-auth",
    "auth-storage",
  ];

  for (const storage of storages) {
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
          parsedValue?.state?.accessToken;

        if (token) {
          return String(token).trim();
        }
      } catch {
        // JSON olmayan kayıtlar atlanır.
      }
    }
  }

  return null;
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
  const response = await fetch(url, {
    mode: "cors",
    headers: createHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `İstek başarısız oldu. HTTP ${response.status}: ${url}`
    );
  }

  return response.json();
}

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

  if (
    result.data &&
    typeof result.data === "object"
  ) {
    return result.data;
  }

  return result;
}

function getProperty(
  source,
  propertyNames
) {
  for (const propertyName of propertyNames) {
    if (
      source?.[propertyName] !== undefined &&
      source?.[propertyName] !== null
    ) {
      return source[propertyName];
    }
  }

  return null;
}

function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function parseNumericId(
  value,
  fallbackId
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.trunc(value);
  }

  const normalizedValue = String(
    value ?? ""
  )
    .trim()
    .replace(",", ".");

  const numberValue =
    Number(normalizedValue);

  if (Number.isFinite(numberValue)) {
    return Math.trunc(numberValue);
  }

  return fallbackId;
}

function isUsableName(value) {
  const text = normalizeText(value);

  if (!text) {
    return false;
  }

  if (/^\d+$/.test(text)) {
    return false;
  }

  return true;
}

function getBoundaryGeoJson(item) {
  const directBoundary =
    item?.boundaryGeoJson ??
    item?.BoundaryGeoJson ??
    item?.boundaryGeoJSON ??
    item?.geoJson ??
    item?.geoJSON;

  if (typeof directBoundary === "string") {
    return directBoundary;
  }

  if (
    directBoundary &&
    typeof directBoundary === "object"
  ) {
    return JSON.stringify(
      directBoundary
    );
  }

  if (item?.geometry) {
    return JSON.stringify(
      item.geometry
    );
  }

  return "";
}

function normalizeRegion(
  region,
  index
) {
  const properties =
    region?.properties ?? region;

  const rawId = getProperty(
    properties,
    [
      "id",
      "Id",
      "ID",
      "regionId",
      "RegionId",
      "objectId",
      "OBJECTID",
    ]
  );

  const name = normalizeText(
    getProperty(
      properties,
      [
        "name",
        "Name",
        "NAME",
        "regionName",
        "RegionName",
        "mahalle",
        "MAHALLE",
      ]
    )
  );

  if (!isUsableName(name)) {
    return null;
  }

  return {
    id: parseNumericId(
      rawId,
      index + 1
    ),

    name,

    boundaryGeoJson:
      getBoundaryGeoJson(region),
  };
}

function normalizeNeighborhood(
  neighborhood,
  index
) {
  const properties =
    neighborhood?.properties ??
    neighborhood;

  const rawId = getProperty(
    properties,
    [
      "id",
      "Id",
      "ID",
      "neighborhoodId",
      "NeighborhoodId",
      "mahalleId",
      "MAHALLE_ID",
      "objectId",
      "OBJECTID",
    ]
  );

  const id = parseNumericId(
    rawId,
    index + 1
  );

  const name = normalizeText(
    getProperty(
      properties,
      [
        "name",
        "Name",
        "NAME",
        "neighborhoodName",
        "NeighborhoodName",
        "mahalle",
        "MAHALLE",
      ]
    )
  );

  if (!isUsableName(name)) {
    return null;
  }

  const regionId = parseNumericId(
    getProperty(
      properties,
      [
        "regionId",
        "RegionId",
        "REGION_ID",
      ]
    ),
    id
  );

  const regionName = normalizeText(
    getProperty(
      properties,
      [
        "regionName",
        "RegionName",
        "REGION_NAME",
      ]
    )
  );

  return {
    id,

    name: name
      .toLocaleLowerCase("tr-TR")
      .includes("mahalle")
      ? name
      : `${name} Mahallesi`,

    regionId,

    regionName:
      regionName || name,

    boundaryGeoJson:
      getBoundaryGeoJson(
        neighborhood
      ),
  };
}

function normalizeRegions(
  regionArray
) {
  const regionMap = new Map();

  regionArray.forEach(
    (region, index) => {
      const normalizedRegion =
        normalizeRegion(
          region,
          index
        );

      if (!normalizedRegion) {
        return;
      }

      if (
        normalizedRegion.id === 0
      ) {
        return;
      }

      if (
        !regionMap.has(
          normalizedRegion.id
        )
      ) {
        regionMap.set(
          normalizedRegion.id,
          normalizedRegion
        );
      }
    }
  );

  return Array.from(
    regionMap.values()
  ).sort((firstRegion, secondRegion) =>
    firstRegion.name.localeCompare(
      secondRegion.name,
      "tr-TR"
    )
  );
}

function normalizeNeighborhoods(
  neighborhoodArray
) {
  const neighborhoodMap =
    new Map();

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

      if (
        !neighborhoodMap.has(
          normalizedNeighborhood.id
        )
      ) {
        neighborhoodMap.set(
          normalizedNeighborhood.id,
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

function normalizeSummary(
  summary,
  regionId
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

    companyDistribution:
      Array.isArray(
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

  const regionArray =
    extractArray(result);

  if (!regionArray) {
    throw new Error(
      "Regions API cevabı geçerli değil."
    );
  }

  return normalizeRegions(
    regionArray
  );
}

async function getRegionsFromLocalGeoJson() {
  const result = await requestJson(
    LOCAL_MAHALLE_URL
  );

  const regionArray =
    extractArray(result);

  if (!regionArray) {
    throw new Error(
      "MAHALLE.geojson cevabı geçerli değil."
    );
  }

  return normalizeRegions(
    regionArray
  );
}

async function getNeighborhoodsFromApi() {
  const result = await requestJson(
    `${API_BASE_URL}/api/neighborhoods`
  );

  const neighborhoodArray =
    extractArray(result);

  if (!neighborhoodArray) {
    throw new Error(
      "Neighborhood API cevabı geçerli değil."
    );
  }

  return normalizeNeighborhoods(
    neighborhoodArray
  );
}

async function getNeighborhoodsFromLocalGeoJson() {
  const result = await requestJson(
    LOCAL_MAHALLE_URL
  );

  const neighborhoodArray =
    extractArray(result);

  if (!neighborhoodArray) {
    throw new Error(
      "MAHALLE.geojson cevabı geçerli değil."
    );
  }

  return normalizeNeighborhoods(
    neighborhoodArray
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
    };
  } catch (apiError) {
    console.warn(
      "Bölgeler API'den alınamadı:",
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
      };
    } catch (localError) {
      console.error(
        "Yerel bölge verileri alınamadı:",
        localError
      );

      return {
        data: [allRegionOption],
        source: "none",
      };
    }
  }
}

export async function getNeighborhoods() {
  try {
    const apiNeighborhoods =
      await getNeighborhoodsFromApi();

    return {
      data: apiNeighborhoods,
      source: "api",
    };
  } catch {
    try {
      const localNeighborhoods =
        await getNeighborhoodsFromLocalGeoJson();

      return {
        data: localNeighborhoods,
        source: "local-geojson",
      };
    } catch {
      return {
        data: [],
        source: "none",
      };
    }
  }
}

export async function getRegionSummary(
  regionId
) {
  const numericRegionId =
    Number(regionId);

  if (
    !Number.isInteger(
      numericRegionId
    ) ||
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
  } catch {
    return {
      data: null,
      source: "none",
    };
  }
}