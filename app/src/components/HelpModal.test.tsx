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
    expect(screen.getByText(/Cliff Period/i)).toBeInTheDocument();
    expect(screen.getByText(/Linear Unlock Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Revocability/i)).toBeInTheDocument();
  });

  it("se cierra con el botón accesible", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpModal open onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /cerrar ayuda/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
