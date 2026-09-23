/**
 * @description Tests de Fase 0 (smoke) + Fase 1 (constantes IDL de layout/seeds).
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

describe("solana_vesting_linear — fase 1 estado y seeds", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .solanaVestingLinear as Program<SolanaVestingLinear>;

  it("expone vestingAccountDataLen = 139 en el IDL", () => {
    const constants = program.idl.constants;
    expect(constants).to.be.an("array");

    const dataLen = constants.find((c) => c.name === "vestingAccountDataLen");
    expect(dataLen, "falta constante vestingAccountDataLen").to.exist;
    expect(dataLen!.value).to.equal("139");
  });

  it("expone seeds PDA vesting y vault en el IDL", () => {
    const constants = program.idl.constants;
    const vestingSeed = constants.find((c) => c.name === "vestingSeed");
    const vaultSeed = constants.find((c) => c.name === "vaultSeed");

    expect(vestingSeed?.value).to.equal('"vesting"');
    expect(vaultSeed?.value).to.equal('"vault"');
  });

  it("expone errores de vesting en el IDL", () => {
    const errorNames = program.idl.errors.map((e) => e.name);
    expect(errorNames).to.include.members([
      "invalidVestingSchedule",
      "mathOverflow",
      "nothingToClaim",
      "notCancelable",
      "unauthorized",
      "invalidAmount",
    ]);
  });
});
