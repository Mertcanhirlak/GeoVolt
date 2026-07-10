const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    import.meta.env.VITE_BACKEND_URL ??
    ""
).trim();

const REQUEST_TIMEOUT_MS = 15000;

function normalizeApiBaseUrl(value) {
  return String(value ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
}

const API_BASE_URL =
  normalizeApiBaseUrl(RAW_API_BASE_URL);

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

function unwrapResponseBody(responseBody) {
  if (
    responseBody &&
    typeof responseBody === "object" &&
    responseBody.data !== undefined
  ) {
    return responseBody.data;
  }

  return responseBody;
}

async function readResponseBody(response) {
  const contentType =
    response.headers.get("content-type") ?? "";

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
    const text = await response.text();

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

      signal: abortController.signal,
    });

    const responseBody =
      await readResponseBody(response);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "Bu işlem için yetkiniz bulunmuyor."
        );
      }

      if (response.status === 404) {
        const serverMessage =
          typeof responseBody === "object"
            ? responseBody?.message ??
              responseBody?.title
            : null;

        throw new Error(
          serverMessage ||
            `İstenen endpoint bulunamadı: ${url}`
        );
      }

      const serverMessage =
        typeof responseBody === "object"
          ? responseBody?.message ??
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
    if (error?.name === "AbortError") {
      throw new Error(
        "Manuel pin isteği zaman aşımına uğradı."
      );
    }

    if (error instanceof TypeError) {
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

    isInsideRegion: Boolean(
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

    latitude: Number(
      response?.latitude ??
        response?.Latitude
    ),

    longitude: Number(
      response?.longitude ??
        response?.Longitude
    ),
  };
}

function normalizeEvaluateResponse(
  response
) {
  return {
    isValid: Boolean(
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

    latitude: Number(
      response?.latitude ??
        response?.Latitude
    ),

    longitude: Number(
      response?.longitude ??
        response?.Longitude
    ),

    estimatedCost:
      response?.estimatedCost ??
      response?.EstimatedCost ??
      null,

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

export async function locateRegionPoint(
  regionId,
  {
    latitude,
    longitude,
  }
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

  const response =
    await requestJson(
      `/api/regions/${numericRegionId}/locate-point`,
      {
        method: "POST",

        body: JSON.stringify({
          latitude:
            Number(latitude),

          longitude:
            Number(longitude),
        }),
      }
    );

  return normalizeLocateResponse(
    response
  );
}

export async function evaluateManualPin({
  regionId,
  latitude,
  longitude,
}) {
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

  const response =
    await requestJson(
      "/api/manual-pin/evaluate",
      {
        method: "POST",

        body: JSON.stringify({
          regionId:
            numericRegionId,

          latitude:
            Number(latitude),

          longitude:
            Number(longitude),
        }),
      }
    );

  return normalizeEvaluateResponse(
    response
  );
}