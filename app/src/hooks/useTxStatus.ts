"use client";

import { useCallback, useMemo, useState } from "react";
import type { TxStatus, TxStatusState } from "@/lib/txStatus";

export interface UseTxStatusResult extends TxStatusState {
  setPending: (message?: string) => void;
  setSuccess: (signature: string, message?: string) => void;
  setFailed: (message: string) => void;
  reset: () => void;
}

const INITIAL: TxStatusState = {
  status: "idle",
  message: null,
  signature: null,
};

/**
 * @description Estado local de feedback de transacciones (Pending/Success/Failed).
 * @returns API tipada para actualizar el banner de estado.
 */
export function useTxStatus(): UseTxStatusResult {
  const [state, setState] = useState<TxStatusState>(INITIAL);

  const setPending = useCallback((message = "Confirmando en el cluster…") => {
    setState({ status: "pending", message, signature: null });
  }, []);

  const setSuccess = useCallback(
    (signature: string, message = "Transacción confirmada") => {
      setState({ status: "success", message, signature });
    },
    []
  );

  const setFailed = useCallback((message: string) => {
    setState({ status: "failed", message, signature: null });
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL);
  }, []);

  return useMemo(
    () => ({
      ...state,
      setPending,
      setSuccess,
      setFailed,
      reset,
    }),
    [state, setPending, setSuccess, setFailed, reset]
  );
}

export type { TxStatus };
