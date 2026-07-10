const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";
const MOCK_MODE = false;

const mockUsers = [
  {
    email: "admin@sistem.com",
    password: "123456",
    id: 1,
    companyId: null,
    fullName: "Sistem Yöneticisi",
    role: "Admin",
    isActive: true,
  },
  {
    email: "firma1@admin.com",
    password: "123456",
    id: 2,
    companyId: 101,
    fullName: "Firma 1 Yöneticisi",
    role: "Admin",
    isActive: true,
  },
  {
    email: "kullanici1@firma1.com",
    password: "123456",
    id: 3,
    companyId: 101,
    fullName: "Firma 1 Kullanıcısı",
    role: "CompanyUser",
    isActive: true,
  },
];

function createMockToken(user) {
  const payload = {
    id: user.id,
    companyId: user.companyId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };

  return `mock.${btoa(JSON.stringify(payload))}.token`;
}

function normalizeAuthResponse(response) {
  if (response?.token) return response;
  if (response?.data?.token) return response.data;

  throw new Error(response?.message || "Giriş yanıtı geçersiz");
}

export function decodeMockToken(token) {
  try {
    const payloadBase64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = payloadBase64.padEnd(payloadBase64.length + ((4 - payloadBase64.length % 4) % 4), "=");
    const payload = JSON.parse(atob(paddedPayload));
    const permissions = payload.permission
      ? Array.isArray(payload.permission) ? payload.permission : [payload.permission]
      : payload.permissions;

    return {
      id: Number(payload.id ?? payload.sub ?? payload.nameid),
      companyId: payload.companyId ? Number(payload.companyId) : null,
      fullName: payload.fullName ?? payload.name ?? payload.unique_name,
      email: payload.email,
      role: Array.isArray(payload.role) ? payload.role[0] : payload.role,
      permissions: Array.isArray(permissions) ? permissions : []
    };
  } catch {
    return null;
  }
}

export async function login(email, password) {
  if (MOCK_MODE) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = mockUsers.find((mockUser) => mockUser.email === email && mockUser.password === password);

        if (!user) return reject(new Error("Email veya şifre hatalı"));
        if (!user.isActive) return reject(new Error("Kullanıcı pasif durumda"));

        resolve({ token: createMockToken(user), user });
      }, 400);
    });
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const response = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(response.message || "Email veya şifre hatalı");
  }

  return normalizeAuthResponse(response);
}

export async function createCompanyUser(newUserData, requesterToken) {
  if (MOCK_MODE) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true, message: "Kullanıcı oluşturuldu (mock)" }), 300);
    });
  }

  const res = await fetch(`${API_BASE_URL}/api/company-users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${requesterToken}` },
    body: JSON.stringify(newUserData),
  });

  if (!res.ok) throw new Error("Kullanıcı oluşturulamadı");

  return res.json();
}
