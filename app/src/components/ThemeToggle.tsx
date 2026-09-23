"use client";

import { useTheme } from "@/hooks/useTheme";

/**
 * @description Botón para alternar tema light/dark con persistencia.
 * @returns Botón accesible que refleja el tema resuelto.
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const next = resolved === "dark" ? "claro" : "oscuro";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Cambiar a tema ${next}`}
      data-testid="theme-toggle"
    >
      Tema: {resolved === "dark" ? "oscuro" : "claro"}
    </button>
  );
}
