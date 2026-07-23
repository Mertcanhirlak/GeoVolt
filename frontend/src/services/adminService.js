const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

async function requestAdmin(path, token, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    if (response.status === 401) {
      throw new Error("Oturum doğrulanamadı. Lütfen tekrar giriş yapın.");
    }

    if (response.status === 403) {
      throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
    }

    if (response.status === 404) {
      throw new Error(
        payload.message ||
        "Sunucu bu yönetim işlemini bulamadı. Uygulama sunucusunu yeniden başlatın."
      );
    }

    throw new Error(payload.message || "İşlem tamamlanamadı.");
  }

  return payload.data;
}

export function getAdminCompanies(token) {
  return requestAdmin("/api/admin/companies", token);
}

export function createAdminCompany(token, company) {
  return requestAdmin("/api/admin/companies", token, {
    method: "POST",
    body: JSON.stringify(company)
  });
}

export function deleteAdminCompany(token, companyId) {
  return requestAdmin(`/api/admin/companies/${companyId}`, token, {
    method: "DELETE"
  });
}

export function getAdminUsers(token) {
  return requestAdmin("/api/admin/users", token);
}

export function createAdminUser(token, user) {
  return requestAdmin("/api/admin/users", token, {
    method: "POST",
    body: JSON.stringify(user)
  });
}

export function deleteAdminUser(token, userId) {
  return requestAdmin(`/api/admin/users/${userId}`, token, {
    method: "DELETE"
  });
}

export function updateAdminUserRole(token, userId, roleData) {
  return requestAdmin(`/api/admin/users/${userId}/role`, token, {
    method: "PATCH",
    body: JSON.stringify(roleData)
  });
}

export function getAdminRoles(token) {
  return requestAdmin("/api/admin/roles", token);
}

export function createAdminRole(token, role) {
  return requestAdmin("/api/admin/roles", token, {
    method: "POST",
    body: JSON.stringify(role)
  });
}

export function updateAdminRole(token, roleId, role) {
  return requestAdmin(`/api/admin/roles/${roleId}`, token, {
    method: "PATCH",
    body: JSON.stringify(role)
  });
}

export function deleteAdminRole(token, roleId) {
  return requestAdmin(`/api/admin/roles/${roleId}`, token, {
    method: "DELETE"
  });
}

export function getAdminPermissions(token) {
  return requestAdmin("/api/admin/permissions", token);
}

export function assignAdminRolePermissions(token, roleId, permissionIds) {
  return requestAdmin(`/api/admin/roles/${roleId}/permissions`, token, {
    method: "PUT",
    body: JSON.stringify({ permissionIds })
  });
}

export function assignAdminUserRoles(token, userId, roleIds) {
  return requestAdmin(`/api/admin/users/${userId}/roles`, token, {
    method: "PUT",
    body: JSON.stringify({ roleIds })
  });
}

export function getAdminUserPermissions(token, userId) {
  return requestAdmin(`/api/admin/users/${userId}/permissions`, token);
}

export function assignAdminUserPermissions(token, userId, permissionIds) {
  return requestAdmin(`/api/admin/users/${userId}/permissions`, token, {
    method: "PUT",
    body: JSON.stringify({ permissionIds })
  });
}

export function getAdminCandidatePoints(token, filters = {}) {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return requestAdmin(`/api/admin/candidate-points${queryString ? `?${queryString}` : ""}`, token);
}

export function createAdminCandidatePoint(token, candidatePoint) {
  return requestAdmin("/api/admin/candidate-points", token, {
    method: "POST",
    body: JSON.stringify(candidatePoint)
  });
}

export function updateAdminCandidatePoint(token, candidatePointId, candidatePoint) {
  return requestAdmin(`/api/admin/candidate-points/${candidatePointId}`, token, {
    method: "PUT",
    body: JSON.stringify(candidatePoint)
  });
}

export function deleteAdminCandidatePoint(token, candidatePointId) {
  return requestAdmin(`/api/admin/candidate-points/${candidatePointId}`, token, {
    method: "DELETE"
  });
}

export function getAdminDataImports(token, limit = 50) {
  return requestAdmin(`/api/admin/data-imports?limit=${limit}`, token);
}

function uploadGeoJson(token, action, file) {
  const formData = new FormData();
  formData.append("file", file);

  return requestAdmin(`/api/admin/data-imports/${action}`, token, {
    method: "POST",
    body: formData
  });
}

export function validateAdminGeoJson(token, file) {
  return uploadGeoJson(token, "validate", file);
}

export function stageAdminGeoJson(token, file) {
  return uploadGeoJson(token, "stage", file);
}

export function promoteAdminDataImport(token, datasetImportId) {
  return requestAdmin(`/api/admin/data-imports/${datasetImportId}/promote`, token, {
    method: "POST"
  });
}

export function generateAdminSuitabilityGrid(token, districtSourceId, gridEdgeMeters) {
  return requestAdmin(`/api/admin/suitability-analysis/districts/${districtSourceId}/grid`, token, {
    method: "POST",
    body: JSON.stringify({ gridEdgeMeters })
  });
}

export function calculateAdminSuitabilityMetrics(token, analysisRunId) {
  return requestAdmin(`/api/admin/suitability-analysis/${analysisRunId}/metrics`, token, {
    method: "POST"
  });
}

export function calculateAdminSuitabilityScores(token, analysisRunId) {
  return requestAdmin(`/api/admin/suitability-analysis/${analysisRunId}/score`, token, {
    method: "POST"
  });
}

export function getAdminSuitabilityCells(token, analysisRunId, filters = {}) {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return requestAdmin(
    `/api/admin/suitability-analysis/${analysisRunId}/cells${queryString ? `?${queryString}` : ""}`,
    token
  );
}

export function promoteAdminSuitabilityCell(token, analysisRunId, cellId) {
  return requestAdmin(`/api/admin/suitability-analysis/${analysisRunId}/cells/${cellId}/candidate`, token, {
    method: "POST"
  });
}

export function promoteAdminRecommendedSuitabilityCells(token, analysisRunId) {
  return requestAdmin(`/api/admin/suitability-analysis/${analysisRunId}/recommended-candidates`, token, {
    method: "POST"
  });
}
