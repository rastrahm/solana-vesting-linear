/**
 * @description Tests unitarios de resolución de tema (sin DOM).
 */
import { describe, expect, it } from "vitest";
import { resolveTheme, toggleResolvedTheme } from "@/lib/theme";
import { txStatusLabel } from "@/lib/txStatus";

describe("resolveTheme", () => {
  it("respeta preferencia light/dark explícita", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("usa prefers-color-scheme cuando preference=system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("toggleResolvedTheme", () => {
  it("alterna light y dark", () => {
    expect(toggleResolvedTheme("light")).toBe("dark");
    expect(toggleResolvedTheme("dark")).toBe("light");
  });
});

describe("txStatusLabel", () => {
  it("expone etiquetas accesibles por estado", () => {
    expect(txStatusLabel("pending")).toMatch(/pendiente/i);
    expect(txStatusLabel("success")).toMatch(/exitosa/i);
    expect(txStatusLabel("failed")).toMatch(/fallida/i);
  });
});
