/**
 * @description Tests de bootstrap, IDL, initialize (Fase 2) y claim (Fase 3).
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
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
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
  const AMOUNT = 1_000_000_000;

  let mint: PublicKey;
  let senderToken: PublicKey;

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
    const { vestingAccount, vestingBump, vault, vaultBump } = derivePdas(
      mint,
      beneficiary.publicKey
    );

    await program.methods
      .initialize(
        new BN(now),
        new BN(now + 100),
        new BN(now + 1000),
        new BN(AMOUNT),
        true
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
    expect(state.totalAmount.toNumber()).to.equal(AMOUNT);
    expect(state.bump).to.equal(vestingBump);
    expect(state.vaultBump).to.equal(vaultBump);

    const vaultAccount = await getAccount(
      provider.connection,
      vault,
      undefined,
      TOKEN_PROGRAM_ID
    );
    expect(Number(vaultAccount.amount)).to.equal(AMOUNT);
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
          new BN(now + 100),
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

describe("solana_vesting_linear — fase 3 claim", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .solanaVestingLinear as Program<SolanaVestingLinear>;

  const sender = (provider.wallet as anchor.Wallet).payer;
  const DECIMALS = 6;
  /** Monto par para que el 50% sea exacto (sin truncamiento). */
  const AMOUNT = 1_000_000_000;

  let mint: PublicKey;
  let senderToken: PublicKey;

  /**
   * @description Obtiene unix time aproximado del cluster via slot/block time.
   */
  async function clusterUnixNow(): Promise<number> {
    const slot = await provider.connection.getSlot("confirmed");
    const blockTime = await provider.connection.getBlockTime(slot);
    if (blockTime !== null) {
      return blockTime;
    }
    return Math.floor(Date.now() / 1000);
  }

  function derivePdas(beneficiaryPk: PublicKey, mintPk: PublicKey) {
    const [vestingAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vesting"),
        sender.publicKey.toBuffer(),
        beneficiaryPk.toBuffer(),
        mintPk.toBuffer(),
      ],
      program.programId
    );
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vestingAccount.toBuffer()],
      program.programId
    );
    return { vestingAccount, vault };
  }

  /**
   * @description Crea mint, fondea sender, airdrop beneficiary, crea vesting y ATA beneficiary.
   */
  async function setupVesting(params: {
    startTime: number;
    cliffTime: number;
    endTime: number;
    beneficiary: Keypair;
  }) {
    const { startTime, cliffTime, endTime, beneficiary } = params;

    const sig = await provider.connection.requestAirdrop(
      beneficiary.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");

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
      AMOUNT,
      [],
      undefined,
      TOKEN_PROGRAM_ID
    );

    const beneficiaryToken = await createAccount(
      provider.connection,
      sender,
      mint,
      beneficiary.publicKey,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    const { vestingAccount, vault } = derivePdas(beneficiary.publicKey, mint);

    await program.methods
      .initialize(
        new BN(startTime),
        new BN(cliffTime),
        new BN(endTime),
        new BN(AMOUNT),
        true
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

    return { vestingAccount, vault, beneficiaryToken, mint };
  }

  it("antes del cliff → NothingToClaim", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const { vestingAccount, vault, beneficiaryToken, mint: m } =
      await setupVesting({
        startTime: now - 100,
        cliffTime: now + 10_000,
        endTime: now + 20_000,
        beneficiary,
      });

    try {
      await program.methods
        .claim()
        .accountsPartial({
          beneficiary: beneficiary.publicKey,
          vestingAccount,
          vault,
          beneficiaryTokenAccount: beneficiaryToken,
          mint: m,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([beneficiary])
        .rpc();
      expect.fail("debía fallar con NothingToClaim");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      expect((err as AnchorError).error.errorCode.code).to.equal(
        "NothingToClaim"
      );
    }
  });

  it("a mitad de duración → claim exacto del 50%", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    // duration = 2000; elapsed ≈ 1000 → 50%. cliff = start (ya pasado).
    const startTime = now - 1000;
    const cliffTime = startTime;
    const endTime = now + 1000;

    const { vestingAccount, vault, beneficiaryToken, mint: m } =
      await setupVesting({ startTime, cliffTime, endTime, beneficiary });

    // Releer cluster time tras setup (puede haber avanzado unos segundos).
    const nowAfter = await clusterUnixNow();
    const duration = endTime - startTime;
    const elapsed = nowAfter - startTime;
    const expectedVested = Math.floor((AMOUNT * elapsed) / duration);

    await program.methods
      .claim()
      .accountsPartial({
        beneficiary: beneficiary.publicKey,
        vestingAccount,
        vault,
        beneficiaryTokenAccount: beneficiaryToken,
        mint: m,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([beneficiary])
      .rpc();

    const state = await program.account.vestingAccount.fetch(vestingAccount);
    const beneficiaryBal = await getAccount(
      provider.connection,
      beneficiaryToken,
      undefined,
      TOKEN_PROGRAM_ID
    );

    // Tolerancia ±2s de deriva de clock entre cálculo local y Clock on-chain.
    const released = state.releasedAmount.toNumber();
    expect(released).to.be.closeTo(expectedVested, Math.floor((AMOUNT * 2) / duration) + 1);
    expect(Number(beneficiaryBal.amount)).to.equal(released);
    expect(released).to.be.greaterThan(AMOUNT * 0.4);
    expect(released).to.be.lessThan(AMOUNT * 0.6);
  });

  it("tras end_time → claim del total restante", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const { vestingAccount, vault, beneficiaryToken, mint: m } =
      await setupVesting({
        startTime: now - 2000,
        cliffTime: now - 1500,
        endTime: now - 10,
        beneficiary,
      });

    await program.methods
      .claim()
      .accountsPartial({
        beneficiary: beneficiary.publicKey,
        vestingAccount,
        vault,
        beneficiaryTokenAccount: beneficiaryToken,
        mint: m,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([beneficiary])
      .rpc();

    const state = await program.account.vestingAccount.fetch(vestingAccount);
    expect(state.releasedAmount.toNumber()).to.equal(AMOUNT);

    const beneficiaryBal = await getAccount(
      provider.connection,
      beneficiaryToken,
      undefined,
      TOKEN_PROGRAM_ID
    );
    expect(Number(beneficiaryBal.amount)).to.equal(AMOUNT);

    const vaultBal = await getAccount(
      provider.connection,
      vault,
      undefined,
      TOKEN_PROGRAM_ID
    );
    expect(Number(vaultBal.amount)).to.equal(0);
  });

  it("segundo claim tras full release → NothingToClaim", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const { vestingAccount, vault, beneficiaryToken, mint: m } =
      await setupVesting({
        startTime: now - 3000,
        cliffTime: now - 2500,
        endTime: now - 20,
        beneficiary,
      });

    await program.methods
      .claim()
      .accountsPartial({
        beneficiary: beneficiary.publicKey,
        vestingAccount,
        vault,
        beneficiaryTokenAccount: beneficiaryToken,
        mint: m,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([beneficiary])
      .rpc();

    try {
      await program.methods
        .claim()
        .accountsPartial({
          beneficiary: beneficiary.publicKey,
          vestingAccount,
          vault,
          beneficiaryTokenAccount: beneficiaryToken,
          mint: m,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([beneficiary])
        .rpc();
      expect.fail("debía fallar con NothingToClaim");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      expect((err as AnchorError).error.errorCode.code).to.equal(
        "NothingToClaim"
      );
    }
  });
});
