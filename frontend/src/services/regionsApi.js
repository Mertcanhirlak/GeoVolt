const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5000"
).trim();

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const LOCAL_MAHALLE_URL =
  "/data/MAHALLE.geojson";

const REQUEST_TIMEOUT_MS = 15000;

const allRegionOption = {
  id: 0,
  name: "Tümü",
  boundaryGeoJson: "",
};

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
    const value =
      storage.getItem(key);

    if (
      value &&
      value.trim()
    ) {
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
    const value =
      storage.getItem(key);

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

  return null;
}

function getStoredToken() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return (
    getStorageToken(
      window.localStorage
    ) ??
    getStorageToken(
      window.sessionStorage
    )
  );
}

function createHeaders() {
  const token =
    getStoredToken();

  return {
    Accept: "application/json",

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),
  };
}

async function requestJson(url) {
  const abortController =
    new AbortController();

  const timeoutId =
    globalThis.setTimeout(() => {
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);

  try {
    const response =
      await fetch(url, {
        mode: "cors",

        headers:
          createHeaders(),

        signal:
          abortController.signal,
      });

    if (!response.ok) {
      throw new Error(
        `İstek başarısız oldu. HTTP ${response.status}: ${url}`
      );
    }

    return await response.json();
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        `İstek zaman aşımına uğradı: ${url}`
      );
    }

    if (
      error instanceof TypeError
    ) {
      throw new Error(
        `Backend bağlantısı kurulamadı: ${url}`
      );
    }

    throw error;
  } finally {
    globalThis.clearTimeout(
      timeoutId
    );
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
    result?.result?.items,
    result?.result?.neighborhoods,
  ];

  for (
    const possibleArray
    of possibleArrays
  ) {
    if (
      Array.isArray(
        possibleArray
      )
    ) {
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
    typeof result.data ===
      "object" &&
    !Array.isArray(
      result.data
    )
  ) {
    return result.data;
  }

  if (
    result.result &&
    typeof result.result ===
      "object" &&
    !Array.isArray(
      result.result
    )
  ) {
    return result.result;
  }

  return result;
}

function getProperty(
  source,
  propertyNames
) {
  for (
    const propertyName
    of propertyNames
  ) {
    if (
      source?.[propertyName] !==
        undefined &&
      source?.[propertyName] !==
        null &&
      source?.[propertyName] !==
        ""
    ) {
      return source[
        propertyName
      ];
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

function normalizeTextKey(value) {
  return normalizeText(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/ı/g, "i")
    .replace(
      /[^a-z0-9]/g,
      ""
    );
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

  const normalizedValue =
    String(value ?? "")
      .trim()
      .replace(",", ".");

  const numberValue =
    Number(normalizedValue);

  if (
    Number.isFinite(
      numberValue
    )
  ) {
    return Math.trunc(
      numberValue
    );
  }

  return fallbackId;
}

function parseNullableNumericId(
  value
) {
  const parsedValue =
    parseNumericId(
      value,
      null
    );

  return (
    Number.isInteger(
      parsedValue
    ) &&
    parsedValue > 0
  )
    ? parsedValue
    : null;
}

function isUsableName(value) {
  const text =
    normalizeText(value);

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
    item?.BoundaryGeoJSON ??
    item?.geoJson ??
    item?.geoJSON ??
    item?.GeoJson ??
    item?.GeoJSON;

  if (
    typeof directBoundary ===
    "string"
  ) {
    return directBoundary;
  }

  if (
    directBoundary &&
    typeof directBoundary ===
      "object"
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
    region?.properties ??
    region;

  const rawId =
    getProperty(
      properties,
      [
        "id",
        "Id",
        "ID",
        "regionId",
        "RegionId",
        "REGION_ID",
        "objectId",
        "OBJECTID",
        "gid",
        "GID",
      ]
    );

  const name =
    normalizeText(
      getProperty(
        properties,
        [
          "name",
          "Name",
          "NAME",
          "regionName",
          "RegionName",
          "REGION_NAME",
          "semt",
          "SEMT",
          "bolge",
          "BOLGE",
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
      getBoundaryGeoJson(
        region
      ),
  };
}

function normalizeNeighborhood(
  neighborhood,
  index,
  scope = {}
) {
  const properties =
    neighborhood?.properties ??
    neighborhood;

  const rawId =
    getProperty(
      properties,
      [
        "id",
        "Id",
        "ID",
        "neighborhoodId",
        "NeighborhoodId",
        "NEIGHBORHOOD_ID",
        "mahalleId",
        "MahalleId",
        "MAHALLE_ID",
        "objectId",
        "OBJECTID",
        "gid",
        "GID",
      ]
    );

  const id =
    parseNumericId(
      rawId,
      index + 1
    );

  const rawName =
    normalizeText(
      getProperty(
        properties,
        [
          "name",
          "Name",
          "NAME",
          "neighborhoodName",
          "NeighborhoodName",
          "NEIGHBORHOOD_NAME",
          "mahalle",
          "Mahalle",
          "MAHALLE",
        ]
      )
    );

  if (
    !isUsableName(
      rawName
    )
  ) {
    return null;
  }

  const explicitRegionId =
    parseNullableNumericId(
      getProperty(
        properties,
        [
          "regionId",
          "RegionId",
          "REGION_ID",
          "parentRegionId",
          "ParentRegionId",
          "PARENT_REGION_ID",
          "semtId",
          "SemtId",
          "SEMT_ID",
          "districtId",
          "DistrictId",
          "DISTRICT_ID",
          "ilceId",
          "IlceId",
          "ILCE_ID",
        ]
      )
    );

  const explicitRegionName =
    normalizeText(
      getProperty(
        properties,
        [
          "regionName",
          "RegionName",
          "REGION_NAME",
          "parentRegionName",
          "ParentRegionName",
          "PARENT_REGION_NAME",
          "semt",
          "Semt",
          "SEMT",
          "districtName",
          "DistrictName",
          "DISTRICT_NAME",
          "ilce",
          "Ilce",
          "ILCE",
        ]
      )
    );

  const scopedRegionId =
    parseNullableNumericId(
      scope.regionId
    );

  const scopedRegionName =
    normalizeText(
      scope.regionName
    );

  const regionId =
    explicitRegionId ??
    scopedRegionId ??
    null;

  const regionName =
    explicitRegionName ||
    scopedRegionName ||
    "";

  const name =
    rawName
      .toLocaleLowerCase(
        "tr-TR"
      )
      .includes("mahalle")
      ? rawName
      : `${rawName} Mahallesi`;

  return {
    id,
    name,
    regionId,
    regionName,

    hasRegionRelation:
      Boolean(
        regionId ||
        regionName
      ),

    boundaryGeoJson:
      getBoundaryGeoJson(
        neighborhood
      ),
  };
}

function normalizeRegions(
  regionArray
) {
  const regionMap =
    new Map();

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
        normalizedRegion.id ===
        0
      ) {
        return;
      }

      const regionKey =
        String(
          normalizedRegion.id
        );

      if (
        !regionMap.has(
          regionKey
        )
      ) {
        regionMap.set(
          regionKey,
          normalizedRegion
        );
      }
    }
  );

  return Array.from(
    regionMap.values()
  ).sort(
    (
      firstRegion,
      secondRegion
    ) =>
      firstRegion.name.localeCompare(
        secondRegion.name,
        "tr-TR"
      )
  );
}

function normalizeNeighborhoods(
  neighborhoodArray,
  scope = {}
) {
  const neighborhoodMap =
    new Map();

  neighborhoodArray.forEach(
    (
      neighborhood,
      index
    ) => {
      const normalizedNeighborhood =
        normalizeNeighborhood(
          neighborhood,
          index,
          scope
        );

      if (
        !normalizedNeighborhood
      ) {
        return;
      }

      const neighborhoodKey =
        `${normalizedNeighborhood.id}-${normalizeTextKey(
          normalizedNeighborhood.name
        )}`;

      if (
        !neighborhoodMap.has(
          neighborhoodKey
        )
      ) {
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

function neighborhoodMatchesRegion(
  neighborhood,
  regionId,
  regionName = ""
) {
  const numericRegionId =
    parseNullableNumericId(
      regionId
    );

  const normalizedRegionName =
    normalizeTextKey(
      regionName
    );

  if (
    numericRegionId &&
    neighborhood.regionId
  ) {
    return (
      String(
        neighborhood.regionId
      ) ===
      String(
        numericRegionId
      )
    );
  }

  if (
    normalizedRegionName &&
    neighborhood.regionName
  ) {
    return (
      normalizeTextKey(
        neighborhood.regionName
      ) ===
      normalizedRegionName
    );
  }

  return false;
}

function filterNeighborhoodsByRegion(
  neighborhoods,
  regionId,
  regionName = ""
) {
  return neighborhoods.filter(
    (neighborhood) =>
      neighborhoodMatchesRegion(
        neighborhood,
        regionId,
        regionName
      )
  );
}

function normalizeScopedNeighborhoods(
  neighborhoodArray,
  regionId,
  regionName
) {
  const normalizedNeighborhoods =
    normalizeNeighborhoods(
      neighborhoodArray
    );

  const hasExplicitRelations =
    normalizedNeighborhoods.some(
      (neighborhood) =>
        neighborhood.hasRegionRelation
    );

  if (
    hasExplicitRelations
  ) {
    return filterNeighborhoodsByRegion(
      normalizedNeighborhoods,
      regionId,
      regionName
    );
  }

  /*
   * Endpoint doğrudan:
   * /api/regions/{id}/neighborhoods
   * veya ?regionId=... şeklinde çağrıldıysa,
   * cevabın seçilen bölgeye ait olduğu kabul edilir.
   */
  return normalizeNeighborhoods(
    neighborhoodArray,
    {
      regionId,
      regionName,
    }
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
            (
              company,
              index
            ) => ({
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
  const result =
    await requestJson(
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
  const result =
    await requestJson(
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

async function getAllNeighborhoodsFromApi() {
  const result =
    await requestJson(
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

async function getNeighborhoodsFromRegionEndpoint(
  regionId,
  regionName
) {
  const result =
    await requestJson(
      `${API_BASE_URL}/api/regions/${regionId}/neighborhoods`
    );

  const neighborhoodArray =
    extractArray(result);

  if (!neighborhoodArray) {
    throw new Error(
      "Bölgesel mahalle API cevabı geçerli değil."
    );
  }

  return normalizeScopedNeighborhoods(
    neighborhoodArray,
    regionId,
    regionName
  );
}

async function getNeighborhoodsFromQueryEndpoint(
  regionId,
  regionName
) {
  const query =
    new URLSearchParams({
      regionId:
        String(regionId),
    });

  const result =
    await requestJson(
      `${API_BASE_URL}/api/neighborhoods?${query.toString()}`
    );

  const neighborhoodArray =
    extractArray(result);

  if (!neighborhoodArray) {
    throw new Error(
      "Filtreli mahalle API cevabı geçerli değil."
    );
  }

  return normalizeScopedNeighborhoods(
    neighborhoodArray,
    regionId,
    regionName
  );
}

async function getNeighborhoodsFromLocalGeoJson() {
  const result =
    await requestJson(
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
      error: null,
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

        source:
          "local-geojson",

        error: null,
      };
    } catch (localError) {
      console.error(
        "Yerel bölge verileri alınamadı:",
        localError
      );

      return {
        data: [
          allRegionOption,
        ],

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
  const hasRegionFilter =
    regionId !== null &&
    regionId !== undefined &&
    regionId !== "";

  const numericRegionId =
    parseNullableNumericId(
      regionId
    );

  if (
    hasRegionFilter &&
    !numericRegionId
  ) {
    return {
      data: [],
      source: "validation",

      error:
        "Mahalleleri getirmek için geçerli bir bölge seçilmelidir.",

      message: "",
    };
  }

  /*
   * Bölge seçildiyse önce gerçek bölgesel endpointler denenir.
   */
  if (numericRegionId) {
    try {
      const neighborhoods =
        await getNeighborhoodsFromRegionEndpoint(
          numericRegionId,
          regionName
        );

      return {
        data:
          neighborhoods,

        source:
          "region-api",

        error: null,

        message:
          neighborhoods.length > 0
            ? `${neighborhoods.length} mahalle getirildi.`
            : "Seçilen bölge için mahalle bulunamadı.",
      };
    } catch (regionEndpointError) {
      console.warn(
        "Bölgesel mahalle endpointi kullanılamadı:",
        regionEndpointError
      );
    }

    try {
      const neighborhoods =
        await getNeighborhoodsFromQueryEndpoint(
          numericRegionId,
          regionName
        );

      return {
        data:
          neighborhoods,

        source:
          "query-api",

        error: null,

        message:
          neighborhoods.length > 0
            ? `${neighborhoods.length} mahalle getirildi.`
            : "Seçilen bölge için mahalle bulunamadı.",
      };
    } catch (queryEndpointError) {
      console.warn(
        "Region ID query parametreli mahalle endpointi kullanılamadı:",
        queryEndpointError
      );
    }

    /*
     * Global endpointten gelen kayıtlar yalnızca
     * gerçek regionId veya regionName ilişkisi varsa filtrelenir.
     */
    try {
      const allNeighborhoods =
        await getAllNeighborhoodsFromApi();

      const filteredNeighborhoods =
        filterNeighborhoodsByRegion(
          allNeighborhoods,
          numericRegionId,
          regionName
        );

      if (
        filteredNeighborhoods.length >
        0
      ) {
        return {
          data:
            filteredNeighborhoods,

          source:
            "api-filtered",

          error: null,

          message:
            `${filteredNeighborhoods.length} mahalle getirildi.`,
        };
      }
    } catch (globalApiError) {
      console.warn(
        "Global mahalle endpointi kullanılamadı:",
        globalApiError
      );
    }

    /*
     * Yerel GeoJSON'da açık bir parent bölge ilişkisi
     * yoksa sahte eşleştirme yapılmaz.
     */
    try {
      const localNeighborhoods =
        await getNeighborhoodsFromLocalGeoJson();

      const filteredLocalNeighborhoods =
        filterNeighborhoodsByRegion(
          localNeighborhoods,
          numericRegionId,
          regionName
        );

      if (
        filteredLocalNeighborhoods.length >
        0
      ) {
        return {
          data:
            filteredLocalNeighborhoods,

          source:
            "local-geojson-filtered",

          error: null,

          message:
            `${filteredLocalNeighborhoods.length} yerel mahalle eşleşmesi bulundu.`,
        };
      }
    } catch (localError) {
      console.warn(
        "Yerel mahalle verisi kullanılamadı:",
        localError
      );
    }

    return {
      data: [],
      source: "none",
      error: null,

      message:
        "Seçilen bölge için doğrulanmış mahalle eşlemesi bulunamadı.",
    };
  }

  /*
   * Region ID verilmediyse bütün mahalleler getirilir.
   * Bu kullanım mevcut sayfa yapısıyla uyumluluk içindir.
   */
  try {
    const apiNeighborhoods =
      await getAllNeighborhoodsFromApi();

    return {
      data:
        apiNeighborhoods,

      source: "api",
      error: null,

      message:
        `${apiNeighborhoods.length} mahalle getirildi.`,
    };
  } catch (apiError) {
    console.warn(
      "Mahalleler API'den alınamadı:",
      apiError
    );

    try {
      const localNeighborhoods =
        await getNeighborhoodsFromLocalGeoJson();

      return {
        data:
          localNeighborhoods,

        source:
          "local-geojson",

        error: null,

        message:
          `${localNeighborhoods.length} yerel mahalle kaydı getirildi.`,
      };
    } catch (localError) {
      console.error(
        "Yerel mahalle verileri alınamadı:",
        localError
      );

      return {
        data: [],
        source: "none",

        error:
          "Mahalle verileri alınamadı.",

        message: "",
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
    const result =
      await requestJson(
        `${API_BASE_URL}/api/regions/${numericRegionId}/summary`
      );

    const summaryObject =
      extractObject(result);

    return {
      data:
        normalizeSummary(
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