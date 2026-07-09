import React, { createContext, useState, useContext, useEffect } from "react";
import { decodeMockToken } from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
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
    if (token && !user) {
      const decoded = decodeMockToken(token);
      setUser(decoded);
    }

    if (!token) {
      setUser(null);
    }
  }, [token, user]);

  const loginUser = (newToken, userData = null) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);

    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    }
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

  const isAdmin = role === "Admin";
  const isCompanyUser = role === "CompanyUser";

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        companyId,
        isAuthenticated,
        isAdmin,
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
