/**
 * @description Tests de la fórmula espejo on-chain.
 */
import { describe, expect, it } from "vitest";
import {
  vestedAmount,
  withdrawableAmount,
  vestingProgressPercent,
} from "@/lib/vestingMath";

describe("vestingMath", () => {
  const base = {
    startTime: 0,
    cliffTime: 0,
    endTime: 1000,
    totalAmount: 1_000_000n,
  };

  it("antes del cliff → 0", () => {
    expect(
      vestedAmount(50, { ...base, cliffTime: 100, endTime: 200 })
    ).toBe(0n);
  });

  it("mitad de duración → 50%", () => {
    expect(vestedAmount(500, base)).toBe(500_000n);
    expect(vestingProgressPercent(500_000n, 1_000_000n)).toBe(50);
  });

  it("claimable = vested - released", () => {
    expect(withdrawableAmount(500n, 200n)).toBe(300n);
  });
});
