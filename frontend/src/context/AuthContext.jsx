import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  decodeMockToken,
} from "../services/authService";

const AuthContext =
  createContext(null);

function readStoredUser() {
  const storedUser =
    localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("user");

    return null;
  }
}

function decodeTokenSafely(token) {
  if (!token) {
    return null;
  }

  try {
    return decodeMockToken(token);
  } catch (error) {
    console.warn(
      "Token çözümlenemedi:",
      error,
    );

    return null;
  }
}

export function AuthProvider({
  children,
}) {
  const [token, setToken] =
    useState(() =>
      localStorage.getItem("token"),
    );

  const [user, setUser] =
    useState(() => {
      const storedUser =
        readStoredUser();

      if (storedUser) {
        return storedUser;
      }

      return decodeTokenSafely(
        localStorage.getItem("token"),
      );
    });

  useEffect(() => {
    if (!token) {
      setUser(null);

      localStorage.removeItem(
        "user",
      );

      return;
    }

    if (!user) {
      const decodedUser =
        decodeTokenSafely(token);

      if (decodedUser) {
        setUser(decodedUser);

        localStorage.setItem(
          "user",
          JSON.stringify(decodedUser),
        );
      }
    }
  }, [token, user]);

  useEffect(() => {
    function handleStorageChange(
      event,
    ) {
      if (event.key === "token") {
        const nextToken =
          event.newValue;

        setToken(nextToken);

        if (!nextToken) {
          setUser(null);

          return;
        }

        const storedUser =
          readStoredUser();

        setUser(
          storedUser ??
            decodeTokenSafely(
              nextToken,
            ),
        );
      }

      if (event.key === "user") {
        setUser(readStoredUser());
      }
    }

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
    };
  }, []);

  function loginUser(
    newToken,
    userData = null,
  ) {
    if (!newToken) {
      throw new Error(
        "Giriş tokenı bulunamadı.",
      );
    }

    const normalizedToken =
      String(newToken).trim();

    const resolvedUser =
      userData ??
      decodeTokenSafely(
        normalizedToken,
      );

    localStorage.setItem(
      "token",
      normalizedToken,
    );

    setToken(normalizedToken);

    if (resolvedUser) {
      localStorage.setItem(
        "user",
        JSON.stringify(resolvedUser),
      );

      setUser(resolvedUser);
    } else {
      localStorage.removeItem(
        "user",
      );

      setUser(null);
    }
  }

  function logoutUser() {
    localStorage.removeItem(
      "token",
    );

    localStorage.removeItem(
      "user",
    );

    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => {
    const isAuthenticated =
      Boolean(token);

    const role =
      user?.role ?? null;

    const companyId =
      user?.companyId ?? null;

    return {
      token,
      user,
      role,
      companyId,
      isAuthenticated,

      isAdmin:
        role === "Admin",

      isCompanyUser:
        role === "CompanyUser",

      loginUser,
      logoutUser,
    };
  }, [token, user]);

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth yalnızca AuthProvider içinde kullanılabilir.",
    );
  }

  return context;
}