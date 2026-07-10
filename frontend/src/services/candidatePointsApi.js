import { mockCandidatePoints } from "../data/mockCandidatePoints";
import {
  mapCandidatePoint,
  mapCandidatePoints,
} from "../utils/candidatePointMapper";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ?? ""
).replace(/\/+$/, "");

const CANDIDATE_POINTS_ENDPOINT = "/api/candidate-points";

const REQUEST_TIMEOUT_MS = 15000;

function getLocalMockCandidates() {
  return Array.isArray(mockCandidatePoints)
    ? mockCandidatePoints
    : [];
}

function createApiUrl(path, queryParameters = {}) {
  const query = new URLSearchParams();

  Object.entries(queryParameters).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  const fullPath = `${API_BASE_URL}${path}`;

  return queryString
    ? `${fullPath}?${queryString}`
    : fullPath;
}

function extractCandidateList(responseBody) {
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

  for (const candidateValue of directCandidates) {
    if (Array.isArray(candidateValue)) {
      return candidateValue;
    }
  }

  /*
   * Bazı API cevapları şu yapıda olabilir:
   *
   * {
   *   data: {
   *     items: [...]
   *   }
   * }
   */
  const nestedContainers = [
    responseBody.data,
    responseBody.result,
    responseBody.value,
  ];

  for (const container of nestedContainers) {
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

    for (const candidateValue of nestedCandidates) {
      if (Array.isArray(candidateValue)) {
        return candidateValue;
      }
    }
  }

  return null;
}

async function requestJson(url, options = {}) {
  const abortController = new AbortController();

  const timeoutId = window.setTimeout(() => {
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,

      headers: {
        Accept: "application/json",
        ...options.headers,
      },

      signal: abortController.signal,
    });

    if (!response.ok) {
      let errorMessage =
        `Aday nokta isteği başarısız oldu. HTTP ${response.status}`;

      try {
        const errorBody = await response.json();

        errorMessage =
          errorBody?.message ||
          errorBody?.title ||
          errorMessage;
      } catch {
        /*
         * Hata cevabı JSON değilse varsayılan
         * hata mesajı kullanılmaya devam eder.
         */
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Aday nokta isteği zaman aşımına uğradı."
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function createCandidateQuery(filters = {}) {
  return {
    regionId: filters.regionId,

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

/**
 * API'den aday noktaları getirir.
 *
 * Backend erişilemezse ekranın bozulmaması için
 * lokal mock veriye geri döner.
 *
 * Dönüş yapısı:
 *
 * {
 *   data: [],
 *   source: "api" | "local-mock",
 *   error: string | null
 * }
 */
export async function getCandidatePoints(
  filters = {}
) {
  const query = createCandidateQuery(filters);

  try {
    const responseBody = await requestJson(
      createApiUrl(
        CANDIDATE_POINTS_ENDPOINT,
        query
      )
    );

    const rawCandidates =
      extractCandidateList(responseBody);

    if (!Array.isArray(rawCandidates)) {
      throw new Error(
        "Aday nokta API cevabında geçerli bir liste bulunamadı."
      );
    }

    return {
      data: mapCandidatePoints(rawCandidates),
      source: "api",
      error: null,
    };
  } catch (error) {
    console.error(
      "Aday nokta verileri API'den alınamadı:",
      error
    );

    return {
      data: mapCandidatePoints(
        getLocalMockCandidates()
      ),

      source: "local-mock",

      error:
        error instanceof Error
          ? error.message
          : "Aday nokta verileri alınamadı.",
    };
  }
}

/**
 * Mevcut liste üzerinden tek bir aday nokta bulur.
 * Backend'de detay endpointi olmasa da çalışır.
 */
export async function getCandidatePointById(
  candidatePointId
) {
  const result = await getCandidatePoints();

  const candidate = result.data.find(
    (item) =>
      String(item.id) ===
      String(candidatePointId)
  );

  return {
    ...result,
    data: candidate ?? null,
  };
}

/**
 * Bölge seçildiğinde kullanılabilecek yardımcı fonksiyon.
 */
export async function getCandidatePointsByRegion(
  regionId,
  additionalFilters = {}
) {
  return getCandidatePoints({
    ...additionalFilters,
    regionId,
  });
}

/**
 * Talha'nın haritasından, API'den veya manuel pin
 * sonucundan gelen tek bir adayı ortak frontend
 * modeline dönüştürür.
 */
export function normalizeCandidatePoint(
  candidatePoint
) {
  return mapCandidatePoint(candidatePoint);
}