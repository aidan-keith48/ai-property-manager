"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { apiFetch, setToken, TOKEN_STORAGE_KEY } from "./api";
import type { LandlordMe } from "./types";

interface AuthState {
  landlord: LandlordMe | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [landlord, setLandlord] = useState<LandlordMe | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const me = await apiFetch<LandlordMe>("/auth/landlord/me");
      setLandlord(me);
    } catch {
      setLandlord(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const hasToken =
      typeof window !== "undefined" && window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (hasToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount, no data-fetching library in Phase 1
      loadMe();
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const { access_token } = await apiFetch<{ access_token: string }>("/auth/landlord/login", {
      method: "POST",
      json: { email, password },
      auth: false,
    });
    setToken(access_token);
    await loadMe();
  }

  async function signup(email: string, password: string, name: string) {
    const { access_token } = await apiFetch<{ access_token: string }>("/auth/landlord/signup", {
      method: "POST",
      json: { email, password, name },
      auth: false,
    });
    setToken(access_token);
    await loadMe();
  }

  function logout() {
    setToken(null);
    setLandlord(null);
  }

  return (
    <AuthContext.Provider value={{ landlord, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
