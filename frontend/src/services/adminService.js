const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

async function requestAdmin(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
      throw new Error("Bu işlem için admin yetkisi gerekiyor.");
    }

    if (response.status === 404) {
      throw new Error("Backend bu admin endpointini bulamadı. API'yi yeniden başlatın.");
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
