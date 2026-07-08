const API_BASE_URL = "http://localhost:5000";
const MOCK_MODE = false;

const mockUsers = [
  {
    email: "admin@sistem.com",
    password: "123456",
    id: 1,
    companyId: null,
    fullName: "Sistem Yoneticisi",
    role: "SystemAdmin",
    isActive: true,
  },
  {
    email: "firma1@admin.com",
    password: "123456",
    id: 2,
    companyId: 101,
    fullName: "Firma 1 Yoneticisi",
    role: "CompanyAdmin",
    isActive: true,
  },
  {
    email: "kullanici1@firma1.com",
    password: "123456",
    id: 3,
    companyId: 101,
    fullName: "Firma 1 Kullanicisi",
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

  throw new Error(response?.message || "Giris yaniti gecersiz");
}

export function decodeMockToken(token) {
  try {
    const payloadBase64 = token.split(".")[1];
    return JSON.parse(atob(payloadBase64));
  } catch {
    return null;
  }
}

export async function login(email, password) {
  if (MOCK_MODE) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = mockUsers.find((mockUser) => mockUser.email === email && mockUser.password === password);

        if (!user) return reject(new Error("Email veya sifre hatali"));
        if (!user.isActive) return reject(new Error("Kullanici pasif durumda"));

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
    throw new Error(response.message || "Email veya sifre hatali");
  }

  return normalizeAuthResponse(response);
}

export async function createCompanyUser(newUserData, requesterToken) {
  if (MOCK_MODE) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true, message: "Kullanici olusturuldu (mock)" }), 300);
    });
  }

  const res = await fetch(`${API_BASE_URL}/api/company-users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${requesterToken}` },
    body: JSON.stringify(newUserData),
  });

  if (!res.ok) throw new Error("Kullanici olusturulamadi");

  return res.json();
}
