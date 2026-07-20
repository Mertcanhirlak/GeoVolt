const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    "http://localhost:5000",
)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const REQUEST_TIMEOUT_MS = 15000;

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.localStorage.getItem("token") ??
    window.sessionStorage.getItem("token")
  )
    ?.replace(/^"|"$/g, "")
    .trim();
}

function validateCoordinate(latitude, longitude) {
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);

  if (
    !Number.isFinite(numericLatitude) ||
    !Number.isFinite(numericLongitude)
  ) {
    throw new Error("Harita koordinatları geçersiz.");
  }

  if (numericLatitude < -90 || numericLatitude > 90) {
    throw new Error("Enlem değeri -90 ile 90 arasında olmalıdır.");
  }

  if (numericLongitude < -180 || numericLongitude > 180) {
    throw new Error("Boylam değeri -180 ile 180 arasında olmalıdır.");
  }

  return {
    latitude: numericLatitude,
    longitude: numericLongitude,
  };
}

export async function evaluateSuitabilityLocation({
  latitude,
  longitude,
  recommendationLimit = 3,
}) {
  const coordinates = validateCoordinate(latitude, longitude);
  const query = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    recommendationLimit: String(recommendationLimit),
  });
  const url = `${API_BASE_URL}/api/suitability/evaluate?${query}`;
  const abortController = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => abortController.abort(),
    REQUEST_TIMEOUT_MS,
  );
  const token = getStoredToken();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: abortController.signal,
    });
    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        responseBody?.message ??
          responseBody?.title ??
          `Konum değerlendirmesi başarısız oldu. HTTP ${response.status}`,
      );
    }

    return responseBody?.data ?? responseBody;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Konum değerlendirmesi zaman aşımına uğradı.");
    }

    if (error instanceof TypeError) {
      throw new Error("Uygunluk servisine bağlantı kurulamadı.");
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
