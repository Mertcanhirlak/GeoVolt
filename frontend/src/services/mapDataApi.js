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

export async function getChargingStations() {
  return getJson("/api/charging-stations");
}

export async function getRegions() {
  return getJson("/api/regions");
}
