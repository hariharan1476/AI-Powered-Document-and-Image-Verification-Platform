"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
  is_email_verified?: boolean;
  status?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  isLoading: boolean;
  setAuthTokens: (accessToken: string, refreshToken: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-powered-document-and-image.onrender.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const setAuthTokens = useCallback((accessToken: string, newRefreshToken: string, userData: User) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    setToken(accessToken);
    setRefreshToken(newRefreshToken);
    setUser(userData);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem("refreshToken");
    if (!storedRefresh) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: storedRefresh }),
      });

      if (!res.ok) throw new Error("Failed to refresh session");

      const data = await res.json();
      setAuthTokens(data.access_token, data.refresh_token, data.user);
      return true;
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      return false;
    }
  }, [setAuthTokens]);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRefresh = localStorage.getItem("refreshToken");

    if (storedToken) {
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Invalid token");
        })
        .then((userData) => {
          setToken(storedToken);
          setRefreshToken(storedRefresh);
          setUser(userData);
        })
        .catch(async () => {
          // Attempt refresh if access token expired
          const success = await refreshSession();
          if (!success) {
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [refreshSession]);

  const login = (accessToken: string, newRefreshToken: string, userData: User) => {
    setAuthTokens(accessToken, newRefreshToken, userData);
    router.push("/");
  };

  const logout = async () => {
    const storedRefresh = localStorage.getItem("refreshToken") || refreshToken;
    const storedToken = localStorage.getItem("token") || token;

    if (storedRefresh && storedToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${storedToken}`,
          },
          body: JSON.stringify({ refresh_token: storedRefresh }),
        });
      } catch (err) {
        console.error("Logout request failed:", err);
      }
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    router.push("/login");
  };

  const logoutAll = async () => {
    const storedToken = localStorage.getItem("token") || token;
    if (storedToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout-all`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
      } catch (err) {
        console.error("Logout-all request failed:", err);
      }
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        login,
        logout,
        logoutAll,
        refreshSession,
        isLoading,
        setAuthTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
