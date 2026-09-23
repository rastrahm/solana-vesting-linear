/**
 * @description Fórmula lineal espejo del on-chain (Clock-based).
 */

export interface VestingScheduleAmounts {
  startTime: number;
  cliffTime: number;
  endTime: number;
  totalAmount: bigint;
  releasedAmount: bigint;
}

/**
 * @description Calcula tokens vestidos en un instante (misma lógica que `math.rs`).
 * @param now Unix timestamp del cluster.
 * @param schedule Parámetros temporales y montos.
 * @returns Cantidad vestida (bigint).
 */
export function vestedAmount(
  now: number,
  schedule: Pick<
    VestingScheduleAmounts,
    "startTime" | "cliffTime" | "endTime" | "totalAmount"
  >
): bigint {
  const { startTime, cliffTime, endTime, totalAmount } = schedule;
  if (now < cliffTime) {
    return 0n;
  }
  if (now >= endTime) {
    return totalAmount;
  }
  const duration = BigInt(endTime - startTime);
  if (duration <= 0n) {
    return 0n;
  }
  const elapsed = BigInt(now - startTime);
  return (totalAmount * elapsed) / duration;
}

/**
 * @description Tokens claimables = vested − released.
 * @param vested Cantidad vestida.
 * @param released Ya reclamado.
 * @returns Withdrawable (mínimo 0).
 */
export function withdrawableAmount(vested: bigint, released: bigint): bigint {
  return vested > released ? vested - released : 0n;
}

/**
 * @description Porcentaje de progreso 0–100 según vested/total.
 * @param vested Cantidad vestida.
 * @param total Monto total.
 * @returns Porcentaje entero 0–100.
 */
export function vestingProgressPercent(vested: bigint, total: bigint): number {
  if (total <= 0n) {
    return 0;
  }
  return Number((vested * 100n) / total);
}
