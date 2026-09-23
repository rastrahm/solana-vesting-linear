"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { vestingLookupSchema } from "@/lib/schemas";
import { getClusterUnixTimestamp } from "@/lib/clock";
import {
  deriveVestingPdas,
  ensureAtaIx,
  getProgramId,
  getVestingProgram,
  TOKEN_PROGRAM_ID,
} from "@/lib/program";
import { VestingProgressBar } from "@/components/VestingProgressBar";
import type { VestingScheduleAmounts } from "@/lib/vestingMath";

export interface ManageVestingPanelProps {
  onPending: (message?: string) => void;
  onSuccess: (signature: string, message?: string) => void;
  onFailed: (message: string) => void;
}

interface LoadedVesting {
  vestingAccount: PublicKey;
  vault: PublicKey;
  mint: PublicKey;
  sender: PublicKey;
  beneficiary: PublicKey;
  schedule: VestingScheduleAmounts;
  cancelable: boolean;
}

/**
 * @description Panel para cargar un vesting, ver progreso, claim y cancel.
 * @param props Callbacks de estado de transacción.
 * @returns UI de gestión on-chain.
 */
export function ManageVestingPanel({
  onPending,
  onSuccess,
  onFailed,
}: ManageVestingPanelProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedVesting | null>(null);
  const [clusterTime, setClusterTime] = useState<number | null>(null);

  const refreshClock = useCallback(async () => {
    try {
      setClusterTime(await getClusterUnixTimestamp(connection));
    } catch {
      setClusterTime(null);
    }
  }, [connection]);

  useEffect(() => {
    void refreshClock();
    const id = window.setInterval(() => void refreshClock(), 5_000);
    return () => window.clearInterval(id);
  }, [refreshClock]);

  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    const parsed = vestingLookupSchema.safeParse({
      sender: fd.get("sender"),
      beneficiary: fd.get("beneficiary"),
      mint: fd.get("mint"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Lookup inválido");
      return;
    }

    try {
      const sender = new PublicKey(parsed.data.sender);
      const beneficiary = new PublicKey(parsed.data.beneficiary);
      const mint = new PublicKey(parsed.data.mint);
      const { vestingAccount, vault } = deriveVestingPdas(
        getProgramId(),
        sender,
        beneficiary,
        mint
      );

      const provider = new AnchorProvider(
        connection,
        wallet as never,
        { commitment: "confirmed" }
      );
      const program = getVestingProgram(provider);
      const account = await program.account.vestingAccount.fetch(vestingAccount);

      setLoaded({
        vestingAccount,
        vault,
        mint,
        sender,
        beneficiary,
        cancelable: account.cancelable,
        schedule: {
          startTime: account.startTime.toNumber(),
          cliffTime: account.cliffTime.toNumber(),
          endTime: account.endTime.toNumber(),
          totalAmount: BigInt(account.totalAmount.toString()),
          releasedAmount: BigInt(account.releasedAmount.toString()),
        },
      });
      await refreshClock();
    } catch (err) {
      setLoaded(null);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      onFailed(msg);
    }
  }

  async function onClaim() {
    if (!loaded || !wallet.publicKey || !wallet.signTransaction) {
      setError("Wallet o vesting no listos");
      return;
    }
    try {
      onPending("Enviando claim…");
      const provider = new AnchorProvider(connection, wallet as never, {
        commitment: "confirmed",
      });
      const program = getVestingProgram(provider);
      const { ata, ix } = await ensureAtaIx(
        connection,
        wallet.publicKey,
        loaded.mint,
        wallet.publicKey
      );
      const builder = program.methods.claim().accountsPartial({
        beneficiary: wallet.publicKey,
        vestingAccount: loaded.vestingAccount,
        vault: loaded.vault,
        beneficiaryTokenAccount: ata,
        mint: loaded.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      });
      if (ix) {
        builder.preInstructions([ix]);
      }
      const sig = await builder.rpc();
      onSuccess(sig, "Claim confirmado");
      // refresh state
      const account = await program.account.vestingAccount.fetch(
        loaded.vestingAccount
      );
      setLoaded({
        ...loaded,
        schedule: {
          ...loaded.schedule,
          releasedAmount: BigInt(account.releasedAmount.toString()),
        },
      });
      await refreshClock();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onFailed(msg);
      setError(msg);
    }
  }

  async function onCancel() {
    if (!loaded || !wallet.publicKey || !wallet.signTransaction) {
      setError("Wallet o vesting no listos");
      return;
    }
    try {
      onPending("Enviando cancel…");
      const provider = new AnchorProvider(connection, wallet as never, {
        commitment: "confirmed",
      });
      const program = getVestingProgram(provider);
      const senderAta = await ensureAtaIx(
        connection,
        wallet.publicKey,
        loaded.mint,
        loaded.sender
      );
      const beneficiaryAta = await ensureAtaIx(
        connection,
        wallet.publicKey,
        loaded.mint,
        loaded.beneficiary
      );
      const pre = [senderAta.ix, beneficiaryAta.ix].filter(
        (ix): ix is NonNullable<typeof ix> => ix !== null
      );
      const builder = program.methods.cancel().accountsPartial({
        sender: wallet.publicKey,
        beneficiary: loaded.beneficiary,
        vestingAccount: loaded.vestingAccount,
        vault: loaded.vault,
        senderTokenAccount: senderAta.ata,
        beneficiaryTokenAccount: beneficiaryAta.ata,
        mint: loaded.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      });
      if (pre.length) {
        builder.preInstructions(pre);
      }
      const sig = await builder.rpc();
      onSuccess(sig, "Vesting cancelado y cerrado");
      setLoaded(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onFailed(msg);
      setError(msg);
    }
  }

  const defaultSender = wallet.publicKey?.toBase58() ?? "";

  return (
    <section className="panel" aria-label="Gestionar vesting">
      <h2>Claim / Cancel</h2>
      <form onSubmit={onLookup} className="stack">
        <label className="field">
          <span>Sender</span>
          <input
            name="sender"
            aria-label="Sender"
            defaultValue={defaultSender}
            key={defaultSender}
            required
          />
        </label>
        <label className="field">
          <span>Beneficiary</span>
          <input name="beneficiary" aria-label="Beneficiary lookup" required />
        </label>
        <label className="field">
          <span>Mint</span>
          <input name="mint" aria-label="Mint lookup" required />
        </label>
        <button type="submit">Cargar vesting</button>
      </form>

      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}

      {loaded ? (
        <div className="stack" style={{ marginTop: "1rem" }}>
          <p className="mono">PDA: {loaded.vestingAccount.toBase58()}</p>
          <VestingProgressBar
            schedule={loaded.schedule}
            clusterTime={clusterTime}
          />
          <div className="actions">
            <button
              type="button"
              aria-label="Reclamar tokens vestidos"
              onClick={() => void onClaim()}
              disabled={!wallet.connected}
            >
              Claim
            </button>
            <button
              type="button"
              aria-label="Cancelar vesting"
              onClick={() => void onCancel()}
              disabled={!wallet.connected || !loaded.cancelable}
            >
              Cancel
            </button>
            <button
              type="button"
              aria-label="Actualizar Clock del cluster"
              onClick={() => void refreshClock()}
            >
              Refresh time
            </button>
          </div>
          {!loaded.cancelable ? (
            <p className="muted">Este vesting no es cancelable.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
