/**
 * @description Tests de la barra de progreso (role=progressbar).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VestingProgressBar } from "@/components/VestingProgressBar";

describe("VestingProgressBar", () => {
  const schedule = {
    startTime: 0,
    cliffTime: 0,
    endTime: 1000,
    totalAmount: 1_000_000n,
    releasedAmount: 0n,
  };

  it("muestra progreso ~50% con cluster time a mitad", () => {
    render(<VestingProgressBar schedule={schedule} clusterTime={500} />);
    const bar = screen.getByRole("progressbar", { name: /progreso de vesting/i });
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText(/Claimable: 500000/)).toBeInTheDocument();
  });

  it("indica carga si no hay cluster time", () => {
    render(<VestingProgressBar schedule={schedule} clusterTime={null} />);
    expect(
      screen.getByRole("status", { name: /cargando tiempo del cluster/i })
    ).toBeInTheDocument();
  });
});
