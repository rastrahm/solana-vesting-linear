/**
 * @description Preferencia de tema: light | dark | system.
 */
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "svl-theme";

/**
 * @description Resuelve el tema efectivo a partir de preferencia y sistema.
 * @param preference Preferencia del usuario (incluye system).
 * @param systemDark Si el OS reporta prefers-color-scheme: dark.
 * @returns Tema aplicado al documento.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean
): ResolvedTheme {
  if (preference === "system") {
    return systemDark ? "dark" : "light";
  }
  return preference;
}

/**
 * @description Alterna light ↔ dark (ignora system: fuerza el opuesto al resuelto).
 * @param current Tema actualmente resuelto.
 * @returns Nueva preferencia explícita.
 */
export function toggleResolvedTheme(current: ResolvedTheme): ThemePreference {
  return current === "dark" ? "light" : "dark";
}
