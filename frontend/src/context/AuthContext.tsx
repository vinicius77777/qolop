import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, login as authLogin, logout as authLogout, register as authRegister } from "../services/authService";
import { clearStoredSession } from "../services/httpClient";
import type { Usuario } from "../services/types";

interface AuthContextValue {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (
    nome: string,
    email: string,
    senha: string,
    empresaNome?: string,
    orgaoPublico?: boolean
  ) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredUser(): Usuario | null {
  const storedUser = localStorage.getItem("usuario");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as Usuario;
  } catch {
    localStorage.removeItem("usuario");
    return null;
  }
}

function persistSession(nextToken: string | null, nextUser: Usuario | null) {
  if (nextToken) {
    localStorage.setItem("token", nextToken);
  } else {
    localStorage.removeItem("token");
  }

  if (nextUser) {
    localStorage.setItem("usuario", JSON.stringify(nextUser));
  } else {
    localStorage.removeItem("usuario");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setToken(null);
  }, []);

  const applySession = useCallback((nextToken: string | null, nextUser: Usuario) => {
    persistSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const refreshSession = useCallback(async () => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken) {
      clearSession();
      return;
    }

    try {
      const currentUser = await getMe();
      applySession(storedToken, currentUser);
    } catch {
      clearSession();
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      const storedToken = localStorage.getItem("token");

      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await getMe();

        if (isMounted) {
          applySession(storedToken, currentUser);
        }
      } catch {
        if (isMounted) {
          clearSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, [applySession, clearSession]);

  const login = useCallback(async (email: string, senha: string) => {
    const response = await authLogin(email, senha);
    applySession(response.token ?? null, response.usuario);
  }, [applySession]);

  const register = useCallback(
    async (
      nome: string,
      email: string,
      senha: string,
      empresaNome?: string,
      orgaoPublico?: boolean
    ) => {
      const response = await authRegister(nome, email, senha, empresaNome, orgaoPublico ?? false);
      applySession(response.token ?? null, response.usuario);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    authLogout();
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [isLoading, login, logout, refreshSession, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}