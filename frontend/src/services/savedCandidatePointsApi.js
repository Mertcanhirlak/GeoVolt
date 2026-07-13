const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5000"
).trim();

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const LEGACY_LOCAL_STORAGE_KEY =
  "savedCandidates";

const MANUAL_STORAGE_KEY_PREFIX =
  "savedCandidates:manual";

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

function decodeJwtPayload(token) {
  if (!token) {
    return null;
  }

  try {
    const payloadPart =
      token.split(".")[1];

    if (!payloadPart) {
      return null;
    }

    const normalizedPayload =
      payloadPart
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const paddedPayload =
      normalizedPayload.padEnd(
        Math.ceil(
          normalizedPayload.length / 4
        ) * 4,
        "="
      );

    const json = decodeURIComponent(
      window
        .atob(paddedPayload)
        .split("")
        .map(
          (character) =>
            `%${character
              .charCodeAt(0)
              .toString(16)
              .padStart(2, "0")}`
        )
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser =
    window.localStorage.getItem(
      "user"
    );

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

function getCurrentUserScope() {
  const storedUser =
    readStoredUser();

  const tokenPayload =
    decodeJwtPayload(getToken());

  const scopeValue =
    storedUser?.id ??
    storedUser?.userId ??
    storedUser?.UserId ??
    storedUser?.email ??
    storedUser?.Email ??
    tokenPayload?.sub ??
    tokenPayload?.nameid ??
    tokenPayload?.userId ??
    tokenPayload?.email ??
    tokenPayload?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    ] ??
    tokenPayload?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    ] ??
    "anonymous";

  return encodeURIComponent(
    String(scopeValue).trim() ||
      "anonymous"
  );
}

function getManualStorageKey() {
  return `${MANUAL_STORAGE_KEY_PREFIX}:${getCurrentUserScope()}`;
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

    return (
      parsedValue ??
      fallbackValue
    );
  } catch {
    return fallbackValue;
  }
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

  if (
    id.startsWith("manual-")
  ) {
    return true;
  }

  const numericId =
    Number(candidate?.id);

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
    `manual-${Date.now()}-${index}`;

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

function mergeCandidates(
  apiCandidates,
  manualCandidates
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

    const keys =
      getCandidateKeys(
        normalizedCandidate
      );

    if (
      keys.some((key) =>
        usedKeys.has(key)
      )
    ) {
      return;
    }

    mergedCandidates.push(
      normalizedCandidate
    );

    keys.forEach((key) =>
      usedKeys.add(key)
    );
  }

  apiCandidates.forEach(
    addCandidate
  );

  manualCandidates.forEach(
    (candidate, index) =>
      addCandidate(
        candidate,
        apiCandidates.length +
          index
      )
  );

  return mergedCandidates;
}

function readManualCandidatesRaw() {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      getManualStorageKey()
    );

  return safeParseJson(
    storedValue,
    []
  );
}

function writeManualCandidates(
  candidates
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const manualCandidates =
    normalizeCandidateList(
      candidates
    ).filter(
      (candidate) =>
        candidate.isManual
    );

  window.localStorage.setItem(
    getManualStorageKey(),
    JSON.stringify(
      manualCandidates
    )
  );
}

function migrateLegacyLocalStorage() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const legacyValue =
    window.localStorage.getItem(
      LEGACY_LOCAL_STORAGE_KEY
    );

  if (!legacyValue) {
    return;
  }

  /*
   * Eski localStorage kaydındaki normal adaylar
   * artık kullanılmaz. Yalnızca manuel adaylar
   * kullanıcıya özel anahtara taşınır.
   */
  const legacyCandidates =
    normalizeCandidateList(
      safeParseJson(
        legacyValue,
        []
      )
    ).filter(
      (candidate) =>
        candidate.isManual
    );

  const currentManualCandidates =
    normalizeCandidateList(
      readManualCandidatesRaw()
    ).filter(
      (candidate) =>
        candidate.isManual
    );

  const mergedManualCandidates =
    mergeCandidates(
      [],
      [
        ...currentManualCandidates,
        ...legacyCandidates,
      ]
    );

  writeManualCandidates(
    mergedManualCandidates
  );

  window.localStorage.removeItem(
    LEGACY_LOCAL_STORAGE_KEY
  );
}

function getManualSavedCandidates() {
  migrateLegacyLocalStorage();

  const manualCandidates =
    normalizeCandidateList(
      readManualCandidatesRaw()
    ).filter(
      (candidate) =>
        candidate.isManual
    );

  writeManualCandidates(
    manualCandidates
  );

  return manualCandidates;
}

function addManualCandidate(
  candidate
) {
  const manualCandidates =
    getManualSavedCandidates();

  const normalizedCandidate =
    normalizeCandidate(
      {
        ...candidate,
        isManual: true,
      },
      manualCandidates.length
    );

  const duplicateCandidate =
    findDuplicate(
      manualCandidates,
      normalizedCandidate
    );

  if (duplicateCandidate) {
    return {
      status: "already-saved",
      data: duplicateCandidate,
    };
  }

  const updatedCandidates = [
    ...manualCandidates,
    normalizedCandidate,
  ];

  writeManualCandidates(
    updatedCandidates
  );

  return {
    status: "saved",
    data: normalizedCandidate,
  };
}

function removeManualCandidate(
  candidateOrId
) {
  const manualCandidates =
    getManualSavedCandidates();

  const targetCandidate =
    typeof candidateOrId ===
    "object"
      ? normalizeCandidate(
          candidateOrId,
          0
        )
      : normalizeCandidate(
          {
            id: candidateOrId,
            isManual: true,
          },
          0
        );

  const updatedCandidates =
    manualCandidates.filter(
      (candidate) =>
        !candidatesMatch(
          candidate,
          targetCandidate
        )
    );

  writeManualCandidates(
    updatedCandidates
  );
}

function extractArray(result) {
  if (Array.isArray(result)) {
    return result;
  }

  const possibleArrays = [
    result?.data,
    result?.items,
    result?.savedCandidatePoints,
    result?.savedCandidates,
    result?.result,
    result?.data?.items,
  ];

  return (
    possibleArrays.find(
      Array.isArray
    ) ?? null
  );
}

function extractObject(result) {
  if (!result) {
    return null;
  }

  if (
    result.data &&
    typeof result.data ===
      "object" &&
    !Array.isArray(result.data)
  ) {
    return result.data;
  }

  if (
    result.result &&
    typeof result.result ===
      "object" &&
    !Array.isArray(result.result)
  ) {
    return result.result;
  }

  return result;
}

async function readResponseBody(
  response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  try {
    if (
      contentType.includes(
        "application/json"
      )
    ) {
      return await response.json();
    }

    return await response.text();
  } catch {
    return null;
  }
}

function getResponseMessage(
  responseBody,
  fallbackMessage
) {
  if (
    responseBody &&
    typeof responseBody ===
      "object"
  ) {
    return (
      responseBody.message ??
      responseBody.Message ??
      responseBody.title ??
      fallbackMessage
    );
  }

  if (
    typeof responseBody ===
      "string" &&
    responseBody.trim()
  ) {
    return responseBody.trim();
  }

  return fallbackMessage;
}

async function getApiSavedCandidates() {
  const token = getToken();

  if (!token) {
    return {
      ok: false,
      status: 401,
      data: [],

      error:
        "Kaydedilen adayları görmek için giriş yapmalısınız.",
    };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/saved-candidate-points`,
      {
        method: "GET",
        mode: "cors",
        headers:
          getAuthHeaders(),
      }
    );

    const responseBody =
      await readResponseBody(
        response
      );

    if (!response.ok) {
      return {
        ok: false,
        status:
          response.status,
        data: [],

        error:
          getResponseMessage(
            responseBody,
            `Kaydedilen adaylar alınamadı. HTTP ${response.status}`
          ),
      };
    }

    const candidateArray =
      extractArray(
        responseBody
      );

    if (!candidateArray) {
      return {
        ok: false,
        status:
          response.status,
        data: [],

        error:
          "Kaydedilen aday API cevabı geçerli değil.",
      };
    }

    return {
      ok: true,
      status:
        response.status,

      data:
        normalizeCandidateList(
          candidateArray
        ),

      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: [],

      error:
        error instanceof Error
          ? error.message
          : "Kaydedilen aday backend bağlantısı kurulamadı.",
    };
  }
}

export async function getSavedCandidatePoints() {
  const manualCandidates =
    getManualSavedCandidates();

  const apiResult =
    await getApiSavedCandidates();

  if (!apiResult.ok) {
    console.warn(
      "Kaydedilen adaylar API'den alınamadı:",
      apiResult.error
    );

    return {
      data: manualCandidates,
      source: "local-storage",

      count:
        manualCandidates.length,

      maxCount:
        MAX_SAVED_CANDIDATES,

      error:
        apiResult.error,

      authRequired:
        apiResult.status === 401 ||
        apiResult.status === 403,
    };
  }

  const mergedCandidates =
    mergeCandidates(
      apiResult.data,
      manualCandidates
    );

  return {
    data: mergedCandidates,

    source:
      manualCandidates.length > 0
        ? "api-and-local-storage"
        : "api",

    count:
      mergedCandidates.length,

    maxCount:
      MAX_SAVED_CANDIDATES,

    error: null,
    authRequired: false,
  };
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
      data:
        duplicateCandidate,

      source:
        duplicateCandidate.isManual
          ? "manual-local-storage"
          : currentResult.source,

      status:
        "already-saved",

      error: null,
    };
  }

  if (
    currentCandidates.length >=
    MAX_SAVED_CANDIDATES
  ) {
    return {
      data:
        normalizedCandidate,

      source:
        currentResult.source,

      status:
        "limit-exceeded",

      error: null,
    };
  }

  /*
   * Yalnızca manuel pinler localStorage'da tutulur.
   */
  if (
    normalizedCandidate.isManual
  ) {
    const localResult =
      addManualCandidate(
        normalizedCandidate
      );

    return {
      data:
        localResult.data,

      source:
        "manual-local-storage",

      status:
        localResult.status,

      error: null,
    };
  }

  /*
   * Normal adaylar hiçbir koşulda localStorage'a
   * kaydedilmez. JWT bulunmuyorsa işlem reddedilir.
   */
  const token = getToken();

  if (!token) {
    return {
      data:
        normalizedCandidate,

      source: "api",

      status:
        "auth-required",

      error:
        "Aday noktayı kaydetmek için yeniden giriş yapmalısınız.",
    };
  }

  const numericCandidateId =
    Number(
      normalizedCandidate.id
    );

  if (
    !Number.isInteger(
      numericCandidateId
    ) ||
    numericCandidateId <= 0
  ) {
    return {
      data:
        normalizedCandidate,

      source: "api",

      status: "error",

      error:
        "Normal aday noktanın geçerli bir backend kimliği bulunamadı.",
    };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/saved-candidate-points/${numericCandidateId}`,
      {
        method: "POST",
        mode: "cors",
        headers:
          getAuthHeaders(),
      }
    );

    const responseBody =
      await readResponseBody(
        response
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return {
        data:
          normalizedCandidate,

        source: "api",

        status:
          "auth-required",

        error:
          getResponseMessage(
            responseBody,
            "Oturumunuz geçersiz veya süresi dolmuş. Yeniden giriş yapın."
          ),
      };
    }

    if (!response.ok) {
      return {
        data:
          normalizedCandidate,

        source: "api",

        status: "error",

        error:
          getResponseMessage(
            responseBody,
            `Aday nokta backend'e kaydedilemedi. HTTP ${response.status}`
          ),
      };
    }

    const apiCandidate =
      extractObject(
        responseBody
      );

    return {
      data:
        apiCandidate
          ? normalizeCandidate(
              apiCandidate,
              0
            )
          : normalizedCandidate,

      source: "api",
      status: "saved",
      error: null,
    };
  } catch (error) {
    console.warn(
      "Aday backend'e kaydedilemedi:",
      error
    );

    return {
      data:
        normalizedCandidate,

      source: "api",
      status: "error",

      error:
        error instanceof Error
          ? error.message
          : "Aday nokta backend üzerinden kaydedilemedi.",
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

  if (candidate.isManual) {
    removeManualCandidate(
      candidate
    );

    return {
      success: true,
      source:
        "local-storage",
      error: null,
    };
  }

  const token = getToken();

  if (!token) {
    return {
      success: false,
      source: "api",

      error:
        "Kaydı silmek için yeniden giriş yapmalısınız.",

      authRequired: true,
    };
  }

  const numericCandidateId =
    Number(candidate.id);

  if (
    !Number.isInteger(
      numericCandidateId
    ) ||
    numericCandidateId <= 0
  ) {
    return {
      success: false,
      source: "api",

      error:
        "Silinecek aday noktanın geçerli bir backend kimliği bulunamadı.",

      authRequired: false,
    };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/saved-candidate-points/${numericCandidateId}`,
      {
        method: "DELETE",
        mode: "cors",
        headers:
          getAuthHeaders(),
      }
    );

    const responseBody =
      await readResponseBody(
        response
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return {
        success: false,
        source: "api",

        error:
          getResponseMessage(
            responseBody,
            "Oturumunuz geçersiz veya süresi dolmuş. Yeniden giriş yapın."
          ),

        authRequired: true,
      };
    }

    /*
     * Backend kaydı daha önce silinmişse 404 sonucunu
     * başarılı kabul ediyoruz.
     */
    if (
      !response.ok &&
      response.status !== 404
    ) {
      return {
        success: false,
        source: "api",

        error:
          getResponseMessage(
            responseBody,
            `Kayıt silinemedi. HTTP ${response.status}`
          ),

        authRequired: false,
      };
    }

    return {
      success: true,

      source:
        "api-and-local-storage",

      error: null,
      authRequired: false,
    };
  } catch (error) {
    console.warn(
      "API kaydı silinemedi:",
      error
    );

    return {
      success: false,
      source: "api",

      error:
        error instanceof Error
          ? error.message
          : "Kayıt backend üzerinden silinemedi.",

      authRequired: false,
    };
  }
}

export {
  MAX_SAVED_CANDIDATES,
};