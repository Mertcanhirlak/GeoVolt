const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const LOCAL_STORAGE_KEY = "savedCandidates";
const MAX_SAVED_CANDIDATES = 10;

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken")
  );
}

function getAuthHeaders() {
  const token = getToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

function safeParseJson(value, fallbackValue) {
  try {
    return JSON.parse(value) || fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function getLocalSavedCandidates() {
  return safeParseJson(localStorage.getItem(LOCAL_STORAGE_KEY), []);
}

function setLocalSavedCandidates(candidates) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(candidates));
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

  if (Array.isArray(result?.savedCandidatePoints)) {
    return result.savedCandidatePoints;
  }

  if (Array.isArray(result?.savedCandidates)) {
    return result.savedCandidates;
  }

  return null;
}

function extractObject(result) {
  if (!result) {
    return null;
  }

  if (result.data && typeof result.data === "object") {
    return result.data;
  }

  return result;
}

function normalizeCandidate(candidate, index) {
  return {
    id:
      candidate.id ??
      candidate.candidatePointId ??
      candidate.pointId ??
      index + 1,

    name:
      candidate.name ??
      candidate.title ??
      `Aday Nokta ${index + 1}`,

    estimatedAddress:
      candidate.estimatedAddress ??
      candidate.address ??
      candidate.fullAddress ??
      "Adres bilgisi yok",

    region:
      candidate.region ??
      candidate.district ??
      candidate.ilce ??
      "Bölge bilgisi yok",

    neighborhood:
      candidate.neighborhood ??
      candidate.mahalle ??
      "Mahalle bilgisi yok",

    estimatedCost:
      candidate.estimatedCost ??
      candidate.cost ??
      candidate.installationCost ??
      null,

    costScore:
      candidate.costScore ??
      candidate.maliyetSkoru ??
      null,

    demandScore:
      candidate.demandScore ??
      candidate.talepSkoru ??
      null,

    generalScore:
      candidate.generalScore ??
      candidate.score ??
      candidate.genelSkor ??
      null,

    latitude:
      candidate.latitude ??
      candidate.lat ??
      null,

    longitude:
      candidate.longitude ??
      candidate.lng ??
      candidate.lon ??
      null,

    systemType:
      candidate.systemType ??
      candidate.chargerType ??
      candidate.sistemTipi ??
      "Veri Eksik",

    placeType:
      candidate.placeType ??
      candidate.locationType ??
      candidate.mekanTuru ??
      "Veri Eksik",

    status:
      candidate.status ??
      "complete"
  };
}

function normalizeCandidateList(candidates) {
  return candidates.map((candidate, index) => normalizeCandidate(candidate, index));
}

function addToLocalStorage(candidate) {
  const savedCandidates = getLocalSavedCandidates();
  const normalizedCandidate = normalizeCandidate(candidate, savedCandidates.length);

  const alreadySaved = savedCandidates.some(
    (item) => String(item.id) === String(normalizedCandidate.id)
  );

  if (alreadySaved) {
    return {
      status: "already-saved",
      data: normalizedCandidate
    };
  }

  if (savedCandidates.length >= MAX_SAVED_CANDIDATES) {
    return {
      status: "limit-exceeded",
      data: normalizedCandidate
    };
  }

  const updatedSavedCandidates = [...savedCandidates, normalizedCandidate];

  setLocalSavedCandidates(updatedSavedCandidates);

  return {
    status: "saved",
    data: normalizedCandidate
  };
}

function removeFromLocalStorage(candidatePointId) {
  const savedCandidates = getLocalSavedCandidates();

  const updatedSavedCandidates = savedCandidates.filter(
    (candidate) => String(candidate.id) !== String(candidatePointId)
  );

  setLocalSavedCandidates(updatedSavedCandidates);
}

function mergeCandidates(apiCandidates, localCandidates) {
  const mergedMap = new Map();

  apiCandidates.forEach((candidate, index) => {
    const normalizedCandidate = normalizeCandidate(candidate, index);
    mergedMap.set(String(normalizedCandidate.id), normalizedCandidate);
  });

  localCandidates.forEach((candidate, index) => {
    const normalizedCandidate = normalizeCandidate(candidate, index);
    mergedMap.set(String(normalizedCandidate.id), normalizedCandidate);
  });

  return Array.from(mergedMap.values());
}

export async function getSavedCandidatePoints() {
  const localCandidates = normalizeCandidateList(getLocalSavedCandidates());

  try {
    const token = getToken();

    if (!token) {
      return {
        data: localCandidates,
        source: "local-storage"
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/saved-candidate-points`, {
      method: "GET",
      headers: {
        ...getAuthHeaders()
      }
    });

    if (!response.ok) {
      return {
        data: localCandidates,
        source: "local-storage"
      };
    }

    const result = await response.json();
    const apiCandidateArray = extractArray(result);

    if (!apiCandidateArray) {
      return {
        data: localCandidates,
        source: "local-storage"
      };
    }

    return {
      data: mergeCandidates(apiCandidateArray, localCandidates),
      source: "api-and-local-storage"
    };
  } catch {
    return {
      data: localCandidates,
      source: "local-storage"
    };
  }
}

export async function saveCandidatePoint(candidate) {
  const localResult = addToLocalStorage(candidate);

  if (localResult.status === "already-saved") {
    return {
      data: localResult.data,
      source: "local-storage",
      status: "already-saved"
    };
  }

  if (localResult.status === "limit-exceeded") {
    return {
      data: localResult.data,
      source: "local-storage",
      status: "limit-exceeded"
    };
  }

  try {
    const token = getToken();

    if (!token) {
      return {
        data: localResult.data,
        source: "local-storage",
        status: "saved"
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/api/saved-candidate-points/${localResult.data.id}`,
      {
        method: "POST",
        headers: {
          ...getAuthHeaders()
        }
      }
    );

    if (!response.ok) {
      return {
        data: localResult.data,
        source: "local-storage",
        status: "saved"
      };
    }

    const result = await response.json();
    const apiCandidate = extractObject(result);

    if (!apiCandidate) {
      return {
        data: localResult.data,
        source: "local-storage",
        status: "saved"
      };
    }

    return {
      data: normalizeCandidate(apiCandidate, 0),
      source: "api-and-local-storage",
      status: "saved"
    };
  } catch {
    return {
      data: localResult.data,
      source: "local-storage",
      status: "saved"
    };
  }
}

export async function deleteSavedCandidatePoint(candidatePointId) {
  removeFromLocalStorage(candidatePointId);

  try {
    const token = getToken();

    if (!token) {
      return {
        success: true,
        source: "local-storage"
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/api/saved-candidate-points/${candidatePointId}`,
      {
        method: "DELETE",
        headers: {
          ...getAuthHeaders()
        }
      }
    );

    if (!response.ok) {
      return {
        success: true,
        source: "local-storage"
      };
    }

    const result = await response.json();

    if (result?.success === false) {
      return {
        success: true,
        source: "local-storage"
      };
    }

    return {
      success: true,
      source: "api-and-local-storage"
    };
  } catch {
    return {
      success: true,
      source: "local-storage"
    };
  }
}