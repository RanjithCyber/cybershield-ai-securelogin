import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  currentUser,
  seedIfEmpty,
  touchSession,
  logoutCurrent,
  type User,
} from "@/lib/auth";

interface Ctx {
  user: User | null;
  refresh: () => void;
  logout: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const refresh = useCallback(() => setUser(currentUser()), []);

  useEffect(() => {
    seedIfEmpty();
    refresh();
    const t = localStorage.getItem("csa.theme") as "dark" | "light" | null;
    if (t) setTheme(t);
    const onActivity = () => touchSession();
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    const i = setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
      clearInterval(i);
    };
  }, [refresh]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("csa.theme", theme);
  }, [theme]);

  const logout = useCallback(() => {
    logoutCurrent();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        refresh,
        logout,
        theme,
        toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
