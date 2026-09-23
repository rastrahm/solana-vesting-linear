"use client";

import { useState, type FormEvent } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { createVestingSchema } from "@/lib/schemas";
import {
  deriveVestingPdas,
  ensureAtaIx,
  getProgramId,
  getVestingProgram,
  toTokenAmount,
  TOKEN_PROGRAM_ID,
} from "@/lib/program";

export interface CreateVestingFormProps {
  onPending: (message?: string) => void;
  onSuccess: (signature: string, message?: string) => void;
  onFailed: (message: string) => void;
}

/**
 * @description Formulario para crear un vesting (initialize on-chain).
 * @param props.onPending / onSuccess / onFailed Callbacks de estado de tx.
 * @returns Formulario validado con Zod.
 */
export function CreateVestingForm({
  onPending,
  onSuccess,
  onFailed,
}: CreateVestingFormProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!wallet.publicKey || !wallet.signTransaction) {
      setError("Conectá una wallet para crear el vesting");
      return;
    }

    const fd = new FormData(event.currentTarget);
    const parsed = createVestingSchema.safeParse({
      beneficiary: fd.get("beneficiary"),
      mint: fd.get("mint"),
      amount: fd.get("amount"),
      decimals: fd.get("decimals") || 6,
      startTime: fd.get("startTime"),
      cliffTime: fd.get("cliffTime"),
      endTime: fd.get("endTime"),
      cancelable: fd.get("cancelable") === "on",
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    const data = parsed.data;
    try {
      onPending("Enviando initialize…");
      const provider = new AnchorProvider(connection, wallet as never, {
        commitment: "confirmed",
      });
      const program = getVestingProgram(provider);
      const sender = wallet.publicKey;
      const beneficiary = new PublicKey(data.beneficiary);
      const mint = new PublicKey(data.mint);
      const { vestingAccount, vault } = deriveVestingPdas(
        getProgramId(),
        sender,
        beneficiary,
        mint
      );

      const { ata: senderTokenAccount, ix: ataIx } = await ensureAtaIx(
        connection,
        sender,
        mint,
        sender
      );

      const amount = toTokenAmount(data.amount, data.decimals);
      const builder = program.methods
        .initialize(
          new BN(data.startTime),
          new BN(data.cliffTime),
          new BN(data.endTime),
          amount,
          data.cancelable
        )
        .accountsPartial({
          sender,
          beneficiary,
          mint,
          vestingAccount,
          vault,
          senderTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        });

      if (ataIx) {
        builder.preInstructions([ataIx]);
      }

      const sig = await builder.rpc();
      onSuccess(sig, "Vesting creado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onFailed(msg);
      setError(msg);
    }
  }

  const now = Math.floor(Date.now() / 1000);

  return (
    <form className="panel" onSubmit={onSubmit} aria-label="Crear vesting">
      <h2>Crear vesting</h2>
      <Field label="Beneficiary" name="beneficiary" placeholder="Pubkey" required />
      <Field label="Mint" name="mint" placeholder="Mint pubkey" required />
      <Field label="Amount" name="amount" type="number" step="any" required />
      <Field label="Decimals" name="decimals" type="number" defaultValue="6" />
      <Field
        label="Start (unix)"
        name="startTime"
        type="number"
        defaultValue={String(now)}
        required
      />
      <Field
        label="Cliff (unix)"
        name="cliffTime"
        type="number"
        defaultValue={String(now + 60)}
        required
      />
      <Field
        label="End (unix)"
        name="endTime"
        type="number"
        defaultValue={String(now + 3600)}
        required
      />
      <label className="field checkbox">
        <input type="checkbox" name="cancelable" defaultChecked />
        Cancelable (revocable por el sender)
      </label>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={!wallet.connected}>
        Initialize
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  step?: string;
  required?: boolean;
}

/**
 * @description Campo de formulario etiquetado.
 */
function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  step,
  required,
}: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={step}
        required={required}
        aria-label={label}
      />
    </label>
  );
}
