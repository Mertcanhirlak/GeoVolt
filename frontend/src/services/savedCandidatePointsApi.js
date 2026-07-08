const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const LOCAL_STORAGE_KEY = "savedCandidates";

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

function getLocalSavedCandidates() {
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
}

function setLocalSavedCandidates(candidates) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(candidates));
}

function addToLocalStorage(candidate) {
  const savedCandidates = getLocalSavedCandidates();

  const alreadySaved = savedCandidates.some((item) => item.id === candidate.id);

  if (alreadySaved) {
    return {
      status: "already-saved",
      data: candidate
    };
  }

  if (savedCandidates.length >= 10) {
    return {
      status: "limit-exceeded",
      data: candidate
    };
  }

  const updatedSavedCandidates = [...savedCandidates, candidate];

  setLocalSavedCandidates(updatedSavedCandidates);

  return {
    status: "saved",
    data: candidate
  };
}

function removeFromLocalStorage(candidatePointId) {
  const savedCandidates = getLocalSavedCandidates();

  const updatedSavedCandidates = savedCandidates.filter(
    (candidate) => candidate.id !== candidatePointId
  );

  setLocalSavedCandidates(updatedSavedCandidates);
}

function mergeCandidates(apiCandidates, localCandidates) {
  const mergedMap = new Map();

  apiCandidates.forEach((candidate) => {
    mergedMap.set(candidate.id, candidate);
  });

  localCandidates.forEach((candidate) => {
    mergedMap.set(candidate.id, candidate);
  });

  return Array.from(mergedMap.values());
}

export async function getSavedCandidatePoints() {
  const localCandidates = getLocalSavedCandidates();

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

    if (!result.success || !Array.isArray(result.data)) {
      return {
        data: localCandidates,
        source: "local-storage"
      };
    }

    return {
      data: mergeCandidates(result.data, localCandidates),
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
      data: candidate,
      source: "local-storage",
      status: "already-saved"
    };
  }

  if (localResult.status === "limit-exceeded") {
    return {
      data: candidate,
      source: "local-storage",
      status: "limit-exceeded"
    };
  }

  try {
    const token = getToken();

    if (!token) {
      return {
        data: candidate,
        source: "local-storage",
        status: "saved"
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/api/saved-candidate-points/${candidate.id}`,
      {
        method: "POST",
        headers: {
          ...getAuthHeaders()
        }
      }
    );

    if (!response.ok) {
      return {
        data: candidate,
        source: "local-storage",
        status: "saved"
      };
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return {
        data: candidate,
        source: "local-storage",
        status: "saved"
      };
    }

    return {
      data: result.data,
      source: "api-and-local-storage",
      status: "saved"
    };
  } catch {
    return {
      data: candidate,
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

    if (!result.success) {
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