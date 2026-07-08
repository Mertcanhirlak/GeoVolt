const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  if (!token) {
    return {};
  }

  return { Authorization: `Bearer ${token}` };
}

async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`${path} request failed: ${response.status}`);
  }

  return response.json();
}

export async function getChargingStations(regionId) {
  const query = regionId ? `?regionId=${regionId}` : "";
  return getJson(`/api/charging-stations${query}`);
}

export async function getChargingStationDetail(id) {
  return getJson(`/api/charging-stations/${id}`);
}

export async function getRegions() {
  return getJson("/api/regions");
}

export async function getRegionSummary(id) {
  return getJson(`/api/regions/${id}/summary`);
}
