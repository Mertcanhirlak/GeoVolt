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

export async function getSavedCandidatePoints() {
  try {
    const token = getToken();

    if (!token) {
      throw new Error("Token bulunamadi.");
    }

    const response = await fetch(`${API_BASE_URL}/api/saved-candidate-points`, {
      method: "GET",
      headers: {
        ...getAuthHeaders()
      }
    });

    if (!response.ok) {
      throw new Error(`Saved candidate points request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error("Saved candidate points response is invalid.");
    }

    return {
      data: result.data,
      source: "api"
    };
  } catch {
    return {
      data: getLocalSavedCandidates(),
      source: "local-storage"
    };
  }
}

export async function saveCandidatePoint(candidate) {
  try {
    const token = getToken();

    if (!token) {
      throw new Error("Token bulunamadi.");
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
      throw new Error(`Save candidate point request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error("Save candidate point response is invalid.");
    }

    return {
      data: result.data,
      source: "api"
    };
  } catch {
    const savedCandidates = getLocalSavedCandidates();

    const alreadySaved = savedCandidates.some((item) => item.id === candidate.id);

    if (alreadySaved) {
      return {
        data: candidate,
        source: "local-storage",
        status: "already-saved"
      };
    }

    if (savedCandidates.length >= 10) {
      return {
        data: candidate,
        source: "local-storage",
        status: "limit-exceeded"
      };
    }

    const updatedSavedCandidates = [...savedCandidates, candidate];

    setLocalSavedCandidates(updatedSavedCandidates);

    return {
      data: candidate,
      source: "local-storage",
      status: "saved"
    };
  }
}

export async function deleteSavedCandidatePoint(candidatePointId) {
  try {
    const token = getToken();

    if (!token) {
      throw new Error("Token bulunamadi.");
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
      throw new Error(`Delete saved candidate point request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error("Delete saved candidate point response is invalid.");
    }

    return {
      success: true,
      source: "api"
    };
  } catch {
    const savedCandidates = getLocalSavedCandidates();

    const updatedSavedCandidates = savedCandidates.filter(
      (candidate) => candidate.id !== candidatePointId
    );

    setLocalSavedCandidates(updatedSavedCandidates);

    return {
      success: true,
      source: "local-storage"
    };
  }
}