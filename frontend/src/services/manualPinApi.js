const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    import.meta.env.VITE_BACKEND_URL ??
    "http://localhost:5000"
).trim();

const REQUEST_TIMEOUT_MS = 15000;

function normalizeApiBaseUrl(value) {
  return String(value ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
}

const API_BASE_URL =
  normalizeApiBaseUrl(
    RAW_API_BASE_URL
  );

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

  for (
    const key
    of directTokenKeys
  ) {
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

  for (
    const key
    of objectKeys
  ) {
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
      // JSON olmayan localStorage kayıtları atlanır.
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

function createUrl(path) {
  if (!API_BASE_URL) {
    throw new Error(
      "Backend adresi bulunamadı. frontend/.env dosyasına VITE_API_BASE_URL ekleyin."
    );
  }

  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

function unwrapResponseBody(
  responseBody
) {
  if (
    responseBody &&
    typeof responseBody ===
      "object" &&
    responseBody.data !==
      undefined
  ) {
    return responseBody.data;
  }

  return responseBody;
}

function toNullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : null;
}

async function readResponseBody(
  response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text =
      await response.text();

    return text || null;
  } catch {
    return null;
  }
}

async function requestJson(
  path,
  options = {}
) {
  const url = createUrl(path);

  const abortController =
    new AbortController();

  const timeoutId =
    globalThis.setTimeout(
      () => {
        abortController.abort();
      },
      REQUEST_TIMEOUT_MS
    );

  const token =
    getStoredToken();

  try {
    const response =
      await fetch(url, {
        ...options,

        mode: "cors",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

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
        response
      );

    if (!response.ok) {
      if (
        response.status ===
        401
      ) {
        throw new Error(
          "Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın."
        );
      }

      if (
        response.status ===
        403
      ) {
        throw new Error(
          "Bu işlem için yetkiniz bulunmuyor."
        );
      }

      if (
        response.status ===
        404
      ) {
        const serverMessage =
          typeof responseBody ===
          "object"
            ? responseBody?.message ??
              responseBody?.Message ??
              responseBody?.title
            : null;

        throw new Error(
          serverMessage ||
            `İstenen endpoint bulunamadı: ${url}`
        );
      }

      const serverMessage =
        typeof responseBody ===
        "object"
          ? responseBody?.message ??
            responseBody?.Message ??
            responseBody?.title
          : null;

      throw new Error(
        serverMessage ||
          `İstek başarısız oldu. HTTP ${response.status}. İstek adresi: ${url}`
      );
    }

    return unwrapResponseBody(
      responseBody
    );
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "Manuel pin isteği zaman aşımına uğradı."
      );
    }

    if (
      error instanceof
      TypeError
    ) {
      throw new Error(
        `Backend bağlantısı kurulamadı. Backend ve CORS ayarlarını kontrol edin. Adres: ${url}`
      );
    }

    throw error;
  } finally {
    globalThis.clearTimeout(
      timeoutId
    );
  }
}

function normalizeLocateResponse(
  response
) {
  return {
    regionId:
      response?.regionId ??
      response?.RegionId ??
      null,

    regionName:
      response?.regionName ??
      response?.RegionName ??
      "",

    isInsideRegion:
      Boolean(
        response?.isInsideRegion ??
          response?.IsInsideRegion
      ),

    neighborhoodId:
      response?.neighborhoodId ??
      response?.NeighborhoodId ??
      null,

    neighborhoodName:
      response?.neighborhoodName ??
      response?.NeighborhoodName ??
      null,

    latitude:
      toNullableNumber(
        response?.latitude ??
          response?.Latitude
      ),

    longitude:
      toNullableNumber(
        response?.longitude ??
          response?.Longitude
      ),
  };
}

function normalizeEvaluateResponse(
  response
) {
  return {
    isValid:
      Boolean(
        response?.isValid ??
          response?.IsValid
      ),

    regionId:
      response?.regionId ??
      response?.RegionId ??
      null,

    regionName:
      response?.regionName ??
      response?.RegionName ??
      "",

    neighborhoodId:
      response?.neighborhoodId ??
      response?.NeighborhoodId ??
      null,

    neighborhoodName:
      response?.neighborhoodName ??
      response?.NeighborhoodName ??
      null,

    latitude:
      toNullableNumber(
        response?.latitude ??
          response?.Latitude
      ),

    longitude:
      toNullableNumber(
        response?.longitude ??
          response?.Longitude
      ),

    estimatedCost:
      toNullableNumber(
        response?.estimatedCost ??
          response?.EstimatedCost
      ),

    costScore:
      toNullableNumber(
        response?.costScore ??
          response?.CostScore
      ),

    demandScore:
      toNullableNumber(
        response?.demandScore ??
          response?.DemandScore
      ),

    generalScore:
      toNullableNumber(
        response?.generalScore ??
          response?.GeneralScore
      ),

    systemType:
      response?.systemType ??
      response?.SystemType ??
      "",

    placeType:
      response?.venueType ??
      response?.VenueType ??
      response?.placeType ??
      response?.PlaceType ??
      "",

    budgetMax:
      toNullableNumber(
        response?.budgetMax ??
          response?.BudgetMax
      ),

    isWithinBudget:
      response?.isWithinBudget ??
      response?.IsWithinBudget ??
      null,

    standardEstimatedCost:
      toNullableNumber(
        response?.standardEstimatedCost ??
          response?.StandardEstimatedCost
      ),

    currencyCode:
      response?.currencyCode ??
      response?.CurrencyCode ??
      "TRY",

    warnings:
      Array.isArray(
        response?.warnings ??
          response?.Warnings
      )
        ? (
            response?.warnings ??
            response?.Warnings
          )
        : [],

    status:
      response?.status ??
      response?.Status ??
      "",

    costSource:
      response?.costSource ??
      response?.CostSource ??
      "",

    message:
      response?.message ??
      response?.Message ??
      "",
  };
}

function validateCoordinate(
  latitude,
  longitude
) {
  const numericLatitude =
    Number(latitude);

  const numericLongitude =
    Number(longitude);

  if (
    !Number.isFinite(
      numericLatitude
    ) ||
    !Number.isFinite(
      numericLongitude
    )
  ) {
    throw new Error(
      "Manuel pin koordinatları geçersiz."
    );
  }

  if (
    numericLatitude < -90 ||
    numericLatitude > 90
  ) {
    throw new Error(
      "Enlem değeri -90 ile 90 arasında olmalıdır."
    );
  }

  if (
    numericLongitude < -180 ||
    numericLongitude > 180
  ) {
    throw new Error(
      "Boylam değeri -180 ile 180 arasında olmalıdır."
    );
  }

  return {
    latitude:
      numericLatitude,

    longitude:
      numericLongitude,
  };
}

function validateRequiredText(
  value,
  fieldLabel
) {
  const text =
    String(value ?? "").trim();

  if (!text) {
    throw new Error(
      `${fieldLabel} seçilmelidir.`
    );
  }

  return text;
}

function validateNumber(
  value,
  fieldLabel,
  {
    integer = false,
    min = null,
    max = null,
  } = {}
) {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    ) ||
    (
      integer &&
      !Number.isInteger(
        numericValue
      )
    ) ||
    (
      min !== null &&
      numericValue < min
    ) ||
    (
      max !== null &&
      numericValue > max
    )
  ) {
    throw new Error(
      `${fieldLabel} geçersiz.`
    );
  }

  return numericValue;
}

function validateRegionId(
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
    throw new Error(
      "Manuel pin için geçerli bir bölge seçilmelidir."
    );
  }

  return numericRegionId;
}

export async function locateRegionPoint(
  regionId,
  {
    latitude,
    longitude,
  }
) {
  const numericRegionId =
    validateRegionId(
      regionId
    );

  const coordinates =
    validateCoordinate(
      latitude,
      longitude
    );

  const response =
    await requestJson(
      `/api/regions/${numericRegionId}/locate-point`,
      {
        method: "POST",

        body: JSON.stringify({
          latitude:
            coordinates.latitude,

          longitude:
            coordinates.longitude,
        }),
      }
    );

  return normalizeLocateResponse(
    response
  );
}

function normalizeManualPinVenueType(value) {
  const normalizedValue = validateRequiredText(
    value,
    "Mekân tipi",
  );

  const venueTypeMap = {
    "İş Merkezi": "Workplace",
    "İş Yeri": "Workplace",
    Workplace: "Workplace",

    AVM: "Mall",
    Mall: "Mall",

    Otoyol: "Highway",
    Highway: "Highway",
  };

  const venueType =
    venueTypeMap[normalizedValue];

  if (!venueType) {
    throw new Error(
      "Mekân tipi İş Merkezi, AVM veya Otoyol olmalıdır.",
    );
  }

  return venueType;
}

export async function evaluateManualPin({
  regionId,
  latitude,
  longitude,
  systemType,
  placeType,
  powerKw,
  connectorCount,
  budget,
}) {
  const numericRegionId =
    validateRegionId(
      regionId
    );

  const coordinates =
    validateCoordinate(
      latitude,
      longitude
    );

  const normalizedPreferences = {
    systemType:
      validateRequiredText(
        systemType,
        "Sistem tipi"
      ),

    venueType:
      normalizeManualPinVenueType(
        placeType,
      ),


    powerKw:
      validateNumber(
        powerKw,
        "Güç değeri",
        {
          min: 1,
          max: 1000,
        }
      ),

    connectorCount:
      validateNumber(
        connectorCount,
        "Konnektör sayısı",
        {
          integer: true,
          min: 1,
          max: 20,
        }
      ),

    budgetMax:
      validateNumber(
        budget,
        "Kurulum bütçesi",
        {
          min: 0.01,
        },
      ),
  };

  const response =
    await requestJson(
      "/api/manual-pin/evaluate",
      {
        method: "POST",

        body: JSON.stringify({
          regionId:
            numericRegionId,

          latitude:
            coordinates.latitude,

          longitude:
            coordinates.longitude,

          ...normalizedPreferences,
        }),
      }
    );

  return normalizeEvaluateResponse(
    response
  );
}
