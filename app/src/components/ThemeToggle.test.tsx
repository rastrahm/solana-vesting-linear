/**
 * @description Tests de interacción del ThemeToggle (rol / aria-label).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("permite cambiar de tema por botón accesible", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", { name: /cambiar a tema/i });
    expect(button).toBeInTheDocument();

    const before = button.textContent;
    await user.click(button);
    expect(button.textContent).not.toEqual(before);
  });
});
