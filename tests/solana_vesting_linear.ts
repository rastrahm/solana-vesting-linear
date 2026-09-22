/**
 * @description Smoke test de Fase 0: verifica deploy y llamada a `initialize` stub.
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { SolanaVestingLinear } from "../target/types/solana_vesting_linear";

describe("solana_vesting_linear — fase 0 bootstrap", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .solanaVestingLinear as Program<SolanaVestingLinear>;

  it("expone el program id declarado", () => {
    expect(program.programId.toBase58()).to.equal(
      "33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba"
    );
  });

  it("ejecuta initialize smoke sin cuentas", async () => {
    const tx = await program.methods.initialize().rpc();
    expect(tx).to.be.a("string").and.have.length.greaterThan(0);
    console.log("smoke initialize signature:", tx);
  });
});
