/**
 * @description Validación Zod del formulario create.
 */
import { describe, expect, it } from "vitest";
import { createVestingSchema } from "@/lib/schemas";

describe("createVestingSchema", () => {
  const valid = {
    beneficiary: "11111111111111111111111111111111",
    mint: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    amount: 100,
    decimals: 6,
    startTime: 100,
    cliffTime: 150,
    endTime: 200,
    cancelable: true,
  };

  it("acepta schedule válido", () => {
    const result = createVestingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rechaza cliff > end", () => {
    const result = createVestingSchema.safeParse({
      ...valid,
      cliffTime: 250,
      endTime: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza amount <= 0", () => {
    const result = createVestingSchema.safeParse({ ...valid, amount: 0 });
    expect(result.success).toBe(false);
  });
});
