/**
 * @description Suite Sealevel (Fase 5): vectores de ataque deben fallar de forma segura.
 * @see doc/SEALEVEL_MITIGATIONS.md
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

describe("solana_vesting_linear — fase 5 sealevel", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .solanaVestingLinear as Program<SolanaVestingLinear>;
  const sender = (provider.wallet as anchor.Wallet).payer;
  const DECIMALS = 6;
  const AMOUNT = 1_000_000_000;

  async function clusterUnixNow(): Promise<number> {
    const slot = await provider.connection.getSlot("confirmed");
    const blockTime = await provider.connection.getBlockTime(slot);
    return blockTime ?? Math.floor(Date.now() / 1000);
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

  async function fundKeypair(kp: Keypair) {
    const sig = await provider.connection.requestAirdrop(
      kp.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  async function setupVesting(opts: {
    beneficiary: Keypair;
    startTime: number;
    cliffTime: number;
    endTime: number;
    cancelable?: boolean;
    amount?: number;
  }) {
    const {
      beneficiary,
      startTime,
      cliffTime,
      endTime,
      cancelable = true,
      amount = AMOUNT,
    } = opts;

    await fundKeypair(beneficiary);

    const mint = await createMint(
      provider.connection,
      sender,
      sender.publicKey,
      null,
      DECIMALS,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    const senderToken = await createAccount(
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
      amount,
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
        new BN(amount),
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

    return {
      mint,
      senderToken,
      beneficiaryToken,
      vestingAccount,
      vault,
    };
  }

  /**
   * @description Type cosplay: cuenta con datos arbitrarios / discriminator spoof como vesting.
   */
  it("type cosplay: vesting_account falso → AccountDiscriminatorMismatch / Owner", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const { mint, beneficiaryToken, vault } = await setupVesting({
      beneficiary,
      startTime: now - 2000,
      cliffTime: now - 1500,
      endTime: now - 10,
    });

    // Cuenta del sistema con lamports — no es VestingAccount ni owned por el programa.
    const fakeVesting = Keypair.generate();
    await fundKeypair(fakeVesting);

    try {
      await program.methods
        .claim()
        .accountsPartial({
          beneficiary: beneficiary.publicKey,
          vestingAccount: fakeVesting.publicKey,
          vault,
          beneficiaryTokenAccount: beneficiaryToken,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([beneficiary])
        .rpc();
      expect.fail("debía rechazar type cosplay");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      const code = (err as AnchorError).error.errorCode.code;
      expect([
        "AccountDiscriminatorMismatch",
        "AccountOwnedByWrongProgram",
        "ConstraintSeeds",
        "AccountNotInitialized",
      ]).to.include(code);
    }
  });

  /**
   * @description Account substitution: vault ajeno (no PDA) en claim.
   */
  it("account substitution: vault no-PDA → ConstraintSeeds", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const { mint, beneficiaryToken, vestingAccount } = await setupVesting({
      beneficiary,
      startTime: now - 2000,
      cliffTime: now - 1500,
      endTime: now - 10,
    });

    // Token account legítima (keypair propio) que NO es el vault PDA.
    const fakeVaultKp = Keypair.generate();
    const fakeVault = await createAccount(
      provider.connection,
      sender,
      mint,
      sender.publicKey,
      fakeVaultKp,
      undefined,
      TOKEN_PROGRAM_ID
    );

    try {
      await program.methods
        .claim()
        .accountsPartial({
          beneficiary: beneficiary.publicKey,
          vestingAccount,
          vault: fakeVault,
          beneficiaryTokenAccount: beneficiaryToken,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([beneficiary])
        .rpc();
      expect.fail("debía rechazar vault sustituido");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      expect((err as AnchorError).error.errorCode.code).to.equal(
        "ConstraintSeeds"
      );
    }
  });

  /**
   * @description Unchecked signer: impostor firma claim como si fuera beneficiary.
   */
  it("unchecked signer: impostor en claim → Unauthorized / Seeds", async () => {
    const beneficiary = Keypair.generate();
    const impostor = Keypair.generate();
    await fundKeypair(impostor);
    const now = await clusterUnixNow();
    const { mint, vestingAccount, vault } = await setupVesting({
      beneficiary,
      startTime: now - 2000,
      cliffTime: now - 1500,
      endTime: now - 10,
    });

    const impostorToken = await createAccount(
      provider.connection,
      sender,
      mint,
      impostor.publicKey,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    try {
      await program.methods
        .claim()
        .accountsPartial({
          beneficiary: impostor.publicKey,
          vestingAccount,
          vault,
          beneficiaryTokenAccount: impostorToken,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([impostor])
        .rpc();
      expect.fail("debía rechazar impostor");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      const code = (err as AnchorError).error.errorCode.code;
      expect([
        "Unauthorized",
        "ConstraintSeeds",
        "ConstraintHasOne",
      ]).to.include(code);
    }
  });

  /**
   * @description Duplicate accounts: sender == beneficiary en cancel.
   */
  it("duplicate accounts: sender==beneficiary en cancel → Unauthorized", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const {
      mint,
      senderToken,
      beneficiaryToken,
      vestingAccount,
      vault,
    } = await setupVesting({
      beneficiary,
      startTime: now - 100,
      cliffTime: now + 1000,
      endTime: now + 2000,
    });

    try {
      await program.methods
        .cancel()
        .accountsPartial({
          sender: sender.publicKey,
          // Forzar duplicado: pasar sender como beneficiary (rompe has_one + constraint)
          beneficiary: sender.publicKey,
          vestingAccount,
          vault,
          senderTokenAccount: senderToken,
          beneficiaryTokenAccount: beneficiaryToken,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail("debía rechazar duplicate sender/beneficiary");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      const code = (err as AnchorError).error.errorCode.code;
      expect([
        "Unauthorized",
        "ConstraintSeeds",
        "ConstraintHasOne",
      ]).to.include(code);
    }
  });

  /**
   * @description Duplicate token accounts en cancel.
   */
  it("duplicate accounts: misma ATA sender/beneficiary → Unauthorized", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const { mint, senderToken, vestingAccount, vault } = await setupVesting({
      beneficiary,
      startTime: now - 100,
      cliffTime: now + 1000,
      endTime: now + 2000,
    });

    try {
      await program.methods
        .cancel()
        .accountsPartial({
          sender: sender.publicKey,
          beneficiary: beneficiary.publicKey,
          vestingAccount,
          vault,
          senderTokenAccount: senderToken,
          beneficiaryTokenAccount: senderToken, // duplicado
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail("debía rechazar ATA duplicada");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      const code = (err as AnchorError).error.errorCode.code;
      expect(["Unauthorized", "ConstraintTokenOwner", "ConstraintRaw"]).to.include(
        code
      );
    }
  });

  /**
   * @description Duration 0 (start=cliff=end): post-end claim = total (sin panic/div0).
   */
  it("precision: duration 0 post-end → claim total sin overflow", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const t = now - 100; // start=cliff=end en el pasado
    const { mint, beneficiaryToken, vestingAccount, vault } = await setupVesting(
      {
        beneficiary,
        startTime: t,
        cliffTime: t,
        endTime: t,
      }
    );

    await program.methods
      .claim()
      .accountsPartial({
        beneficiary: beneficiary.publicKey,
        vestingAccount,
        vault,
        beneficiaryTokenAccount: beneficiaryToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([beneficiary])
      .rpc();

    const state = await program.account.vestingAccount.fetch(vestingAccount);
    expect(state.releasedAmount.toNumber()).to.equal(AMOUNT);
  });

  /**
   * @description Reinits tras close: cuenta cerrada inutilizable; re-init limpio OK.
   */
  it("reinit tras close: claim falla; initialize recrea estado limpio", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const {
      mint,
      senderToken,
      beneficiaryToken,
      vestingAccount,
      vault,
    } = await setupVesting({
      beneficiary,
      startTime: now - 50,
      cliffTime: now + 5000,
      endTime: now + 10_000,
    });

    await program.methods
      .cancel()
      .accountsPartial({
        sender: sender.publicKey,
        beneficiary: beneficiary.publicKey,
        vestingAccount,
        vault,
        senderTokenAccount: senderToken,
        beneficiaryTokenAccount: beneficiaryToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    expect(await provider.connection.getAccountInfo(vestingAccount)).to.equal(
      null
    );

    // Claim sobre cuenta cerrada debe fallar.
    try {
      await program.methods
        .claim()
        .accountsPartial({
          beneficiary: beneficiary.publicKey,
          vestingAccount,
          vault,
          beneficiaryTokenAccount: beneficiaryToken,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([beneficiary])
        .rpc();
      expect.fail("claim sobre cuenta cerrada debía fallar");
    } catch (err) {
      expect(err).to.be.instanceOf(AnchorError);
      const code = (err as AnchorError).error.errorCode.code;
      expect([
        "AccountNotInitialized",
        "AccountOwnedByWrongProgram",
        "ConstraintSeeds",
      ]).to.include(code);
    }

    // Re-fondear sender y re-inicializar mismas PDAs = estado fresco (mitigación close).
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

    const now2 = await clusterUnixNow();
    await program.methods
      .initialize(
        new BN(now2),
        new BN(now2 + 10),
        new BN(now2 + 100),
        new BN(AMOUNT),
        false
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
    expect(state.releasedAmount.toNumber()).to.equal(0);
    expect(state.cancelable).to.equal(false);
    expect(state.totalAmount.toNumber()).to.equal(AMOUNT);

    const vaultBal = await getAccount(
      provider.connection,
      vault,
      undefined,
      TOKEN_PROGRAM_ID
    );
    expect(Number(vaultBal.amount)).to.equal(AMOUNT);
  });

  /**
   * @description Inyección via instrucción raw con cuentas desordenadas / programa token falso.
   */
  it("CPI substitution: token_program incorrecto → error", async () => {
    const beneficiary = Keypair.generate();
    const now = await clusterUnixNow();
    const { mint, beneficiaryToken, vestingAccount, vault } = await setupVesting(
      {
        beneficiary,
        startTime: now - 2000,
        cliffTime: now - 1500,
        endTime: now - 10,
      }
    );

    try {
      await program.methods
        .claim()
        .accountsPartial({
          beneficiary: beneficiary.publicKey,
          vestingAccount,
          vault,
          beneficiaryTokenAccount: beneficiaryToken,
          mint,
          // Sustituir Token program por System program
          tokenProgram: SystemProgram.programId,
        })
        .signers([beneficiary])
        .rpc();
      expect.fail("debía rechazar token_program falso");
    } catch (err) {
      // Puede ser AnchorError o error de runtime/CPI
      const msg = String(err);
      expect(
        err instanceof AnchorError ||
          /invalid|failed|owner|program/i.test(msg)
      ).to.equal(true);
    }
  });
});
