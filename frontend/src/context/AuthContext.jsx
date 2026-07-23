import { createContext, useState, useContext, useEffect } from "react";
import { decodeMockToken } from "../services/authService";

const AuthContext = createContext();

const managementPermissions = [
  "user.read",
  "user.create",
  "user.update",
  "user.delete",
  "user.role.assign",
  "role.read",
  "role.create",
  "role.update",
  "role.delete",
  "permission.assign",
  "point.read",
  "point.create",
  "point.update",
  "point.delete",
  "dashboard.admin.view"
];

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      return decodeMockToken(storedToken);
    }

    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  useEffect(() => {
    if (token) {
      const decoded = decodeMockToken(token);

      if (decoded) {
        localStorage.setItem("user", JSON.stringify(decoded));
        setUser(decoded);
      }
    }

    if (!token) {
      setUser(null);
    }
  }, [token]);

  const loginUser = (newToken, userData = null) => {
    const tokenUser = decodeMockToken(newToken);
    const nextUser = tokenUser ?? userData;

    localStorage.setItem("token", newToken);
    setToken(newToken);

    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
    }

    return nextUser;
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;
  const role = user?.role ?? null;
  const companyId = user?.companyId ?? null;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const mustChangePassword = user?.mustChangePassword === true;

  const isAdmin = role === "Admin";
  const isCompanyUser = role === "CompanyUser";
  const hasPermission = (permission) => isAdmin || permissions.includes(permission);
  const hasAnyPermission = (permissionList) => isAdmin || permissionList.some((permission) => permissions.includes(permission));
  const canAccessManagement = !isCompanyUser && hasAnyPermission(managementPermissions);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        companyId,
        permissions,
        mustChangePassword,
        isAuthenticated,
        isAdmin,
        isCompanyUser,
        hasPermission,
        hasAnyPermission,
        canAccessManagement,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
