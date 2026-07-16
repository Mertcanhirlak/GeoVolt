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
      "false",
  )
    .trim()
    .toLocaleLowerCase("tr-TR") ===
  "true";

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

export async function scanCandidatePointsByRegion(
  regionId,
  minGeneralScore = 80,
  additionalFilters = {},
) {
  const numericRegionId =
    Number(regionId);

  const numericMinimumScore =
    Number(minGeneralScore);

  if (
    !Number.isInteger(
      numericRegionId,
    ) ||
    numericRegionId <= 0
  ) {
    return {
      data: [],
      source: "validation",

      error:
        "Bölgeyi taramak için geçerli bir bölge seçmelisiniz.",

      message: "",
      isRealData: false,
      regionId: null,

      minGeneralScore:
        numericMinimumScore,
    };
  }

  if (
    !Number.isFinite(
      numericMinimumScore,
    ) ||
    numericMinimumScore < 0 ||
    numericMinimumScore > 100
  ) {
    return {
      data: [],
      source: "validation",

      error:
        "Minimum genel skor 0 ile 100 arasında olmalıdır.",

      message: "",
      isRealData: false,

      regionId:
        numericRegionId,

      minGeneralScore: null,
    };
  }

  if (
    !CANDIDATE_POINTS_API_ENABLED
  ) {
    return {
      data: [],
      source: "disabled",
      error: null,

      message:
        "Gerçek aday backend'i henüz aktif değil. Demo sonuç gerçek tarama sonucu gibi gösterilmiyor.",

      isRealData: false,

      regionId:
        numericRegionId,

      minGeneralScore:
        numericMinimumScore,
    };
  }

  const result =
    await getCandidatePoints({
      ...additionalFilters,

      regionId:
        numericRegionId,

      minGeneralScore:
        numericMinimumScore,
    });

  if (!result.isRealData) {
    return {
      ...result,

      regionId:
        numericRegionId,

      minGeneralScore:
        numericMinimumScore,
    };
  }

  const verifiedCandidates =
    result.data.filter(
      (candidate) => {
        const score = Number(
          candidate?.generalScore,
        );

        return (
          Number.isFinite(score) &&
          score >=
            numericMinimumScore
        );
      },
    );

  return {
    ...result,

    data:
      verifiedCandidates,

    message:
      result.message ||
      `${verifiedCandidates.length} bölgesel aday nokta getirildi.`,

    regionId:
      numericRegionId,

    minGeneralScore:
      numericMinimumScore,
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