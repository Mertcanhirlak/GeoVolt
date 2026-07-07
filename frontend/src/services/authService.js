
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MOCK_MODE = true;

const mockUsers = [
  {
    email: "admin@sistem.com",
    password: "123456",
    id: 1,
    companyId: null,
    fullName: "Sistem Yöneticisi",
    role: "SystemAdmin",
    isActive: true,
  },
  {
    email: "firma1@admin.com",
    password: "123456",
    id: 2,
    companyId: 101,
    fullName: "Firma 1 Yöneticisi",
    role: "CompanyAdmin",
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
        const user = mockUsers.find(
          (u) => u.email === email && u.password === password
        );
        if (!user) {
          reject(new Error("Email veya şifre hatalı"));
          return;
        }
        if (!user.isActive) {
          reject(new Error("Kullanıcı pasif durumda"));
          return;
        }
        resolve({ token: createMockToken(user) });
      }, 400); 
    });
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Giriş başarısız");
  return res.json(); // { token }
}


export async function createCompanyUser(newUserData, requesterToken) {
  if (MOCK_MODE) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: "Kullanıcı oluşturuldu (mock)" });
      }, 300);
    });
  }

  const res = await fetch(`${API_BASE_URL}/api/company-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requesterToken}`,
    },
    body: JSON.stringify(newUserData),
  });
  if (!res.ok) throw new Error("Kullanıcı oluşturulamadı");
  return res.json();
}