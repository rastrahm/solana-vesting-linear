"use client";

import type { TxStatus } from "@/lib/txStatus";
import { txStatusLabel } from "@/lib/txStatus";

export interface TxStatusBannerProps {
  status: TxStatus;
  message: string | null;
  signature: string | null;
}

/**
 * @description Banner de estado de transacción (Pending / Success / Failed).
 * @param props.status Estado actual.
 * @param props.message Mensaje opcional para el usuario.
 * @param props.signature Firma de tx si hubo éxito.
 * @returns Región live con feedback accesible, o null si idle.
 */
export function TxStatusBanner({
  status,
  message,
  signature,
}: TxStatusBannerProps) {
  if (status === "idle") {
    return null;
  }

  const label = txStatusLabel(status);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-status={status}
      className="tx-banner"
    >
      <strong>{label}</strong>
      {message ? <p>{message}</p> : null}
      {signature ? (
        <p>
          <span className="mono">Sig: {signature.slice(0, 8)}…</span>
        </p>
      ) : null}
    </div>
  );
}
