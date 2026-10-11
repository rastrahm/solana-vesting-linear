/**
 * @description Tests de interacción Help modal (Cliff / Linear / Revocability).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpModal } from "@/components/HelpModal";

describe("HelpModal", () => {
  it("explica los tres conceptos requeridos", () => {
    render(<HelpModal open onClose={() => undefined} />);
    expect(
      screen.getByRole("dialog", { name: /ayuda: conceptos de vesting/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Cliff Period/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Linear Unlock Rate/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Revocability/i })
    ).toBeInTheDocument();
  });

  it("incluye guía paso a paso y ejemplos simples", () => {
    render(<HelpModal open onClose={() => undefined} />);
    expect(
      screen.getByRole("heading", { name: /paso a paso/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/1000 tokens/i)).toBeInTheDocument();
  });

  it("se cierra con el botón accesible", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpModal open onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /cerrar ayuda/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
