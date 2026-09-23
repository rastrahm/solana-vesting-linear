/**
 * @description Tests de bootstrap, constantes IDL e initialize (Fase 2).
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorError } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { SolanaVestingLinear } from "../target/types/solana_vesting_linear";

describe("solana_vesting_linear — fase 0/1 bootstrap e IDL", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .solanaVestingLinear as Program<SolanaVestingLinear>;

  it("expone el program id declarado", () => {
    expect(program.programId.toBase58()).to.equal(
      "33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba"
    );
  });

  it("expone vestingAccountDataLen = 139 en el IDL", () => {
    const dataLen = program.idl.constants.find(
      (c) => c.name === "vestingAccountDataLen"
    );
    expect(dataLen!.value).to.equal("139");
  });

  it("expone seeds PDA vesting y vault en el IDL", () => {
    const vestingSeed = program.idl.constants.find((c) => c.name === "vestingSeed");
    const vaultSeed = program.idl.constants.find((c) => c.name === "vaultSeed");
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

describe("solana_vesting_linear — fase 2 initialize", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .solanaVestingLinear as Program<SolanaVestingLinear>;

  const sender = (provider.wallet as anchor.Wallet).payer;
  const beneficiary = Keypair.generate();
  const DECIMALS = 6;
  const AMOUNT = 1_000_000_000; // 1000 tokens

  let mint: PublicKey;
  let senderToken: PublicKey;

  /**
   * @description Deriva PDAs de vesting y vault según seeds documentadas.
   */
  function derivePdas(mintPk: PublicKey, beneficiaryPk: PublicKey) {
    const [vestingAccount, vestingBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vesting"),
        sender.publicKey.toBuffer(),
        beneficiaryPk.toBuffer(),
        mintPk.toBuffer(),
      ],
      program.programId
    );
    const [vault, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vestingAccount.toBuffer()],
      program.programId
    );
    return { vestingAccount, vestingBump, vault, vaultBump };
  }

  before(async () => {
    mint = await createMint(
      provider.connection,
      sender,
      sender.publicKey,
      null,
      DECIMALS,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    senderToken = await createAccount(
      provider.connection,
      sender,
      mint,
      sender.publicKey,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    await mintTo(
      provider.connection,
      sender,
      mint,
      senderToken,
      sender,
      AMOUNT * 10,
      [],
      undefined,
      TOKEN_PROGRAM_ID
    );
  });

  it("persiste estado y deja el vault con total_amount", async () => {
    const now = Math.floor(Date.now() / 1000);
    const startTime = now;
    const cliffTime = now + 100;
    const endTime = now + 1000;
    const amount = new BN(AMOUNT);
    const cancelable = true;

    const { vestingAccount, vestingBump, vault, vaultBump } = derivePdas(
      mint,
      beneficiary.publicKey
    );

    await program.methods
      .initialize(
        new BN(startTime),
        new BN(cliffTime),
        new BN(endTime),
        amount,
        cancelable
      )
      .accountsPartial({
        sender: sender.publicKey,
        beneficiary: beneficiary.publicKey,
        mint,
        vestingAccount,
        vault,
        senderTokenAccount: senderToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.vestingAccount.fetch(vestingAccount);
    expect(state.sender.toBase58()).to.equal(sender.publicKey.toBase58());
    expect(state.beneficiary.toBase58()).to.equal(beneficiary.publicKey.toBase58());
    expect(state.mint.toBase58()).to.equal(mint.toBase58());
    expect(state.startTime.toNumber()).to.equal(startTime);
    expect(state.cliffTime.toNumber()).to.equal(cliffTime);
    expect(state.endTime.toNumber()).to.equal(endTime);
    expect(state.totalAmount.toNumber()).to.equal(AMOUNT);
    expect(state.releasedAmount.toNumber()).to.equal(0);
    expect(state.cancelable).to.equal(true);
    expect(state.bump).to.equal(vestingBump);
    expect(state.vaultBump).to.equal(vaultBump);

    const vaultAccount = await getAccount(
      provider.connection,
      vault,
      undefined,
      TOKEN_PROGRAM_ID
    );
    expect(Number(vaultAccount.amount)).to.equal(AMOUNT);
    expect(vaultAccount.owner.toBase58()).to.equal(vestingAccount.toBase58());
  });

  it("rechaza schedule inválido (cliff > end)", async () => {
    const otherBeneficiary = Keypair.generate();
    const now = Math.floor(Date.now() / 1000);
    const { vestingAccount, vault } = derivePdas(mint, otherBeneficiary.publicKey);

    try {
      await program.methods
        .initialize(
          new BN(now),
          new BN(now + 500),
          new BN(now + 100), // end < cliff
          new BN(AMOUNT),
          false
        )
        .accountsPartial({
          sender: sender.publicKey,
          beneficiary: otherBeneficiary.publicKey,
          mint,
          vestingAccount,
          vault,
          senderTokenAccount: senderToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("debía fallar con InvalidVestingSchedule");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      expect((err as AnchorError).error.errorCode.code).to.equal(
        "InvalidVestingSchedule"
      );
    }
  });

  it("rechaza amount = 0", async () => {
    const otherBeneficiary = Keypair.generate();
    const now = Math.floor(Date.now() / 1000);
    const { vestingAccount, vault } = derivePdas(mint, otherBeneficiary.publicKey);

    try {
      await program.methods
        .initialize(
          new BN(now),
          new BN(now + 10),
          new BN(now + 100),
          new BN(0),
          false
        )
        .accountsPartial({
          sender: sender.publicKey,
          beneficiary: otherBeneficiary.publicKey,
          mint,
          vestingAccount,
          vault,
          senderTokenAccount: senderToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("debía fallar con InvalidAmount");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      expect((err as AnchorError).error.errorCode.code).to.equal("InvalidAmount");
    }
  });
});
