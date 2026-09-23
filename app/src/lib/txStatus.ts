/**
 * @description Tipos y helpers de estado de transacción on-chain para feedback UI.
 */
export type TxStatus = "idle" | "pending" | "success" | "failed";

export interface TxStatusState {
  status: TxStatus;
  message: string | null;
  signature: string | null;
}

/**
 * @description Etiqueta accesible según el estado de la transacción.
 * @param status Estado actual de la tx.
 * @returns Texto corto para aria-label / banner.
 */
export function txStatusLabel(status: TxStatus): string {
  switch (status) {
    case "idle":
      return "Sin transacción";
    case "pending":
      return "Transacción pendiente";
    case "success":
      return "Transacción exitosa";
    case "failed":
      return "Transacción fallida";
  }
}
