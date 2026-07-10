const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5000"
).trim();

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const LOCAL_STORAGE_KEY =
  "savedCandidates";

const MAX_SAVED_CANDIDATES = 10;

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

function getToken() {
  if (typeof window === "undefined") {
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

function getAuthHeaders() {
  const token = getToken();

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

function safeParseJson(
  value,
  fallbackValue
) {
  try {
    const parsedValue =
      JSON.parse(value);

    return parsedValue ??
      fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function getLocalSavedCandidates() {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      LOCAL_STORAGE_KEY
    );

  const parsedValue =
    safeParseJson(
      storedValue,
      []
    );

  return Array.isArray(parsedValue)
    ? parsedValue
    : [];
}

function setLocalSavedCandidates(
  candidates
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(candidates)
  );
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

  if (
    Array.isArray(
      result?.savedCandidatePoints
    )
  ) {
    return result.savedCandidatePoints;
  }

  if (
    Array.isArray(
      result?.savedCandidates
    )
  ) {
    return result.savedCandidates;
  }

  if (
    Array.isArray(
      result?.result
    )
  ) {
    return result.result;
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

function toNullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalizedValue =
    typeof value === "string"
      ? value
          .trim()
          .replace(",", ".")
      : value;

  const numberValue =
    Number(normalizedValue);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : null;
}

function isManualCandidate(candidate) {
  if (
    candidate?.isManual === true
  ) {
    return true;
  }

  const id = String(
    candidate?.id ?? ""
  ).toLocaleLowerCase("tr-TR");

  if (id.startsWith("manual-")) {
    return true;
  }

  /*
   * Backend yalnızca integer candidatePointId kabul ediyor.
   * Sayısal olmayan adaylar manuel/lokal kabul edilir.
   */
  const numericId = Number(
    candidate?.id
  );

  return (
    !Number.isInteger(numericId) ||
    numericId <= 0
  );
}

function normalizeCandidate(
  candidate,
  index = 0
) {
  const latitude =
    toNullableNumber(
      candidate?.latitude ??
        candidate?.lat
    );

  const longitude =
    toNullableNumber(
      candidate?.longitude ??
        candidate?.lng ??
        candidate?.lon
    );

  const rawId =
    candidate?.id ??
    candidate?.candidatePointId ??
    candidate?.pointId ??
    `local-${Date.now()}-${index}`;

  const normalizedCandidate = {
    id: rawId,

    name:
      candidate?.name ??
      candidate?.title ??
      `Aday Nokta ${index + 1}`,

    estimatedAddress:
      candidate?.estimatedAddress ??
      candidate?.address ??
      candidate?.fullAddress ??
      "Adres bilgisi yok",

    region:
      candidate?.region ??
      candidate?.regionName ??
      candidate?.district ??
      candidate?.ilce ??
      "Bölge bilgisi yok",

    neighborhood:
      candidate?.neighborhood ??
      candidate?.neighborhoodName ??
      candidate?.mahalle ??
      "Mahalle bilgisi yok",

    regionId:
      candidate?.regionId ??
      candidate?.RegionId ??
      null,

    neighborhoodId:
      candidate?.neighborhoodId ??
      candidate?.NeighborhoodId ??
      null,

    estimatedCost:
      toNullableNumber(
        candidate?.estimatedCost ??
          candidate?.cost ??
          candidate?.installationCost
      ),

    costScore:
      toNullableNumber(
        candidate?.costScore ??
          candidate?.maliyetSkoru
      ),

    demandScore:
      toNullableNumber(
        candidate?.demandScore ??
          candidate?.talepSkoru
      ),

    generalScore:
      toNullableNumber(
        candidate?.generalScore ??
          candidate?.score ??
          candidate?.genelSkor
      ),

    latitude,
    longitude,

    systemType:
      candidate?.systemType ??
      candidate?.chargerType ??
      candidate?.sistemTipi ??
      "Veri Eksik",

    placeType:
      candidate?.placeType ??
      candidate?.locationType ??
      candidate?.mekanTuru ??
      "Veri Eksik",

    status:
      candidate?.status ??
      "complete",

    costSource:
      candidate?.costSource ??
      "",

    manualMessage:
      candidate?.manualMessage ??
      candidate?.message ??
      "",

    savedAt:
      candidate?.savedAt ??
      new Date().toISOString(),
  };

  normalizedCandidate.isManual =
    isManualCandidate({
      ...candidate,
      id: rawId,
    });

  return normalizedCandidate;
}

function normalizeCandidateList(
  candidates
) {
  if (!Array.isArray(candidates)) {
    return [];
  }

  return candidates.map(
    (candidate, index) =>
      normalizeCandidate(
        candidate,
        index
      )
  );
}

function createCoordinateKey(
  candidate
) {
  const latitude =
    toNullableNumber(
      candidate?.latitude
    );

  const longitude =
    toNullableNumber(
      candidate?.longitude
    );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return [
    "coordinate",
    latitude.toFixed(6),
    longitude.toFixed(6),
  ].join(":");
}

function createIdKey(candidate) {
  if (
    candidate?.id === null ||
    candidate?.id === undefined ||
    candidate?.id === ""
  ) {
    return null;
  }

  return `id:${String(
    candidate.id
  )}`;
}

function getCandidateKeys(candidate) {
  return [
    createIdKey(candidate),
    createCoordinateKey(candidate),
  ].filter(Boolean);
}

function candidatesMatch(
  firstCandidate,
  secondCandidate
) {
  const firstKeys =
    new Set(
      getCandidateKeys(
        firstCandidate
      )
    );

  return getCandidateKeys(
    secondCandidate
  ).some((key) =>
    firstKeys.has(key)
  );
}

function mergeCandidates(
  apiCandidates,
  localCandidates
) {
  const mergedCandidates = [];
  const usedKeys = new Set();

  function addCandidate(
    candidate,
    index
  ) {
    const normalizedCandidate =
      normalizeCandidate(
        candidate,
        index
      );

    const candidateKeys =
      getCandidateKeys(
        normalizedCandidate
      );

    const alreadyExists =
      candidateKeys.some((key) =>
        usedKeys.has(key)
      );

    if (alreadyExists) {
      return;
    }

    mergedCandidates.push(
      normalizedCandidate
    );

    candidateKeys.forEach((key) =>
      usedKeys.add(key)
    );
  }

  apiCandidates.forEach(
    addCandidate
  );

  localCandidates.forEach(
    (
      candidate,
      index
    ) =>
      addCandidate(
        candidate,
        apiCandidates.length +
          index
      )
  );

  return mergedCandidates;
}

function findDuplicate(
  candidates,
  candidate
) {
  return candidates.find(
    (savedCandidate) =>
      candidatesMatch(
        savedCandidate,
        candidate
      )
  );
}

function addToLocalStorage(
  candidate
) {
  const localCandidates =
    normalizeCandidateList(
      getLocalSavedCandidates()
    );

  const normalizedCandidate =
    normalizeCandidate(
      candidate,
      localCandidates.length
    );

  const duplicateCandidate =
    findDuplicate(
      localCandidates,
      normalizedCandidate
    );

  if (duplicateCandidate) {
    return {
      status: "already-saved",
      data: duplicateCandidate,
    };
  }

  const updatedCandidates = [
    ...localCandidates,
    normalizedCandidate,
  ];

  setLocalSavedCandidates(
    updatedCandidates
  );

  return {
    status: "saved",
    data: normalizedCandidate,
  };
}

function removeFromLocalStorage(
  candidateOrId
) {
  const localCandidates =
    normalizeCandidateList(
      getLocalSavedCandidates()
    );

  const targetCandidate =
    typeof candidateOrId ===
    "object"
      ? normalizeCandidate(
          candidateOrId,
          0
        )
      : {
          id: candidateOrId,
        };

  const updatedCandidates =
    localCandidates.filter(
      (candidate) =>
        !candidatesMatch(
          candidate,
          targetCandidate
        )
    );

  setLocalSavedCandidates(
    updatedCandidates
  );
}

async function getApiSavedCandidates() {
  const token = getToken();

  if (!token) {
    return [];
  }

  const response = await fetch(
    `${API_BASE_URL}/api/saved-candidate-points`,
    {
      method: "GET",
      mode: "cors",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Kaydedilen adaylar alınamadı. HTTP ${response.status}`
    );
  }

  const result =
    await response.json();

  const candidateArray =
    extractArray(result);

  if (!candidateArray) {
    throw new Error(
      "Kaydedilen aday API cevabı geçerli değil."
    );
  }

  return normalizeCandidateList(
    candidateArray
  );
}

export async function getSavedCandidatePoints() {
  const localCandidates =
    normalizeCandidateList(
      getLocalSavedCandidates()
    );

  try {
    const apiCandidates =
      await getApiSavedCandidates();

    const mergedCandidates =
      mergeCandidates(
        apiCandidates,
        localCandidates
      );

    return {
      data: mergedCandidates,

      source:
        apiCandidates.length > 0 &&
        localCandidates.length > 0
          ? "api-and-local-storage"
          : apiCandidates.length > 0
            ? "api"
            : "local-storage",

      count: mergedCandidates.length,

      maxCount:
        MAX_SAVED_CANDIDATES,
    };
  } catch (error) {
    console.warn(
      "Kaydedilen adaylar API'den alınamadı:",
      error
    );

    return {
      data: localCandidates,
      source: "local-storage",
      count: localCandidates.length,
      maxCount:
        MAX_SAVED_CANDIDATES,
    };
  }
}

export async function saveCandidatePoint(
  candidate
) {
  const normalizedCandidate =
    normalizeCandidate(
      candidate,
      0
    );

  const currentResult =
    await getSavedCandidatePoints();

  const currentCandidates =
    Array.isArray(
      currentResult.data
    )
      ? currentResult.data
      : [];

  const duplicateCandidate =
    findDuplicate(
      currentCandidates,
      normalizedCandidate
    );

  if (duplicateCandidate) {
    return {
      data: duplicateCandidate,

      source:
        duplicateCandidate.isManual
          ? "local-storage"
          : currentResult.source,

      status: "already-saved",
    };
  }

  if (
    currentCandidates.length >=
    MAX_SAVED_CANDIDATES
  ) {
    return {
      data: normalizedCandidate,
      source:
        currentResult.source,
      status: "limit-exceeded",
    };
  }

  /*
   * Manuel pinler backend SavedCandidatePoint tablosuna
   * kaydedilemez. Çünkü backend yalnızca integer ve mevcut
   * CandidatePointId kabul etmektedir.
   */
  if (
    normalizedCandidate.isManual
  ) {
    const localResult =
      addToLocalStorage(
        normalizedCandidate
      );

    return {
      data: localResult.data,
      source: "local-storage",
      status: localResult.status,
    };
  }

  const numericCandidateId =
    Number(
      normalizedCandidate.id
    );

  const token = getToken();

  if (
    !token ||
    !Number.isInteger(
      numericCandidateId
    ) ||
    numericCandidateId <= 0
  ) {
    const localResult =
      addToLocalStorage(
        normalizedCandidate
      );

    return {
      data: localResult.data,
      source: "local-storage",
      status: localResult.status,
    };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/saved-candidate-points/${numericCandidateId}`,
      {
        method: "POST",
        mode: "cors",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Aday kaydedilemedi. HTTP ${response.status}`
      );
    }

    let result = null;

    try {
      result =
        await response.json();
    } catch {
      result = null;
    }

    const apiCandidate =
      extractObject(result);

    return {
      data: apiCandidate
        ? normalizeCandidate(
            apiCandidate,
            0
          )
        : normalizedCandidate,

      source: "api",
      status: "saved",
    };
  } catch (error) {
    console.warn(
      "Aday API'ye kaydedilemedi, lokal kayıt kullanılacak:",
      error
    );

    const localResult =
      addToLocalStorage(
        normalizedCandidate
      );

    return {
      data: localResult.data,
      source: "local-storage",
      status: localResult.status,
    };
  }
}

export async function deleteSavedCandidatePoint(
  candidateOrId
) {
  const candidate =
    typeof candidateOrId ===
    "object"
      ? normalizeCandidate(
          candidateOrId,
          0
        )
      : normalizeCandidate(
          {
            id: candidateOrId,
          },
          0
        );

  removeFromLocalStorage(
    candidate
  );

  if (candidate.isManual) {
    return {
      success: true,
      source: "local-storage",
    };
  }

  const numericCandidateId =
    Number(candidate.id);

  const token = getToken();

  if (
    !token ||
    !Number.isInteger(
      numericCandidateId
    ) ||
    numericCandidateId <= 0
  ) {
    return {
      success: true,
      source: "local-storage",
    };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/saved-candidate-points/${numericCandidateId}`,
      {
        method: "DELETE",
        mode: "cors",
        headers: getAuthHeaders(),
      }
    );

    if (
      !response.ok &&
      response.status !== 404
    ) {
      throw new Error(
        `Kayıt silinemedi. HTTP ${response.status}`
      );
    }

    return {
      success: true,
      source: "api-and-local-storage",
    };
  } catch (error) {
    console.warn(
      "API kaydı silinemedi:",
      error
    );

    return {
      success: true,
      source: "local-storage",
    };
  }
}

export {
  MAX_SAVED_CANDIDATES,
};