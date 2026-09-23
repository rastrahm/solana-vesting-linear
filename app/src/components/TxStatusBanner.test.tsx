/**
 * @description Tests de interacción del banner de estado de transacción.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TxStatusBanner } from "@/components/TxStatusBanner";

describe("TxStatusBanner", () => {
  it("no renderiza nada en idle", () => {
    const { container } = render(
      <TxStatusBanner status="idle" message={null} signature={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("anuncia estado pendiente por role=status", () => {
    render(
      <TxStatusBanner
        status="pending"
        message="Confirmando…"
        signature={null}
      />
    );
    expect(
      screen.getByRole("status", { name: /transacción pendiente/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/confirmando/i)).toBeInTheDocument();
  });

  it("muestra firma truncada en success", () => {
    render(
      <TxStatusBanner
        status="success"
        message="Ok"
        signature="ABCDEFGHijklmnopqrstuvwxyz"
      />
    );
    expect(
      screen.getByRole("status", { name: /transacción exitosa/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Sig: ABCDEFGH/i)).toBeInTheDocument();
  });
});
