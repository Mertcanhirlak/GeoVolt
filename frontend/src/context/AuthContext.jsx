import { createContext, useState, useContext, useEffect } from "react";
import { decodeMockToken } from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      const decoded = decodeMockToken(token);
      setUser(decoded);
    } else {
      setUser(null);
    }
  }, [token]);

  const loginUser = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;
  const role = user?.role ?? null;
  const companyId = user?.companyId ?? null;

  const isSystemAdmin = role === "SystemAdmin";
  const isCompanyAdmin = role === "CompanyAdmin";
  const isCompanyUser = role === "CompanyUser";

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        companyId,
        isAuthenticated,
        isSystemAdmin,
        isCompanyAdmin,
        isCompanyUser,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
