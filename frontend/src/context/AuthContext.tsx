"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  githubEnabled: boolean;
  login: () => void;
  demoLogin: () => void;
  logout: () => void;
  setToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubEnabled, setGithubEnabled] = useState(false);

  useEffect(() => {
    api.getGithubStatus()
      .then((s) => setGithubEnabled(s.configured))
      .catch(() => setGithubEnabled(false));

    const token = api.getToken();
    if (token) {
      api.getMe().then(setUser).catch(() => api.setToken(null)).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = () => {
    window.location.href = api.getGithubLoginUrl();
  };

  const demoLogin = () => {
    window.location.href = api.getDemoLoginUrl();
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    window.location.href = "/";
  };

  const setToken = async (token: string) => {
    api.setToken(token);
    const me = await api.getMe();
    setUser(me);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo: user?.github_id === 0,
        githubEnabled,
        login,
        demoLogin,
        logout,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
