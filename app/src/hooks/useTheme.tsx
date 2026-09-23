"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  THEME_STORAGE_KEY,
  resolveTheme,
  toggleResolvedTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

export interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * @description Provider de tema light/dark con persistencia y detección de sistema.
 * @param props.children Árbol React hijo.
 * @returns Provider que aplica `data-theme` en `<html>`.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setPreferenceState(stored);
    }

    const onChange = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
    };
    media.addEventListener("change", onChange);
    setHydrated(true);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved = useMemo(
    () => resolveTheme(preference, systemDark),
    [preference, systemDark]
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    document.documentElement.setAttribute("data-theme", resolved);
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }, [hydrated, preference, resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState(toggleResolvedTheme(resolved));
  }, [resolved]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * @description Hook para leer/cambiar el tema desde componentes cliente.
 * @returns Contexto de tema tipado.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return ctx;
}
