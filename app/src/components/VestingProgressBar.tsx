"use client";

import {
  vestingProgressPercent,
  vestedAmount,
  withdrawableAmount,
  type VestingScheduleAmounts,
} from "@/lib/vestingMath";

export interface VestingProgressBarProps {
  schedule: VestingScheduleAmounts;
  clusterTime: number | null;
}

/**
 * @description Barra de progreso de unlock basada en cluster time + fórmula on-chain.
 * @param props.schedule Estado temporal y montos del vesting.
 * @param props.clusterTime Unix del Clock sysvar (null = cargando).
 * @returns Progressbar accesible con vested/released/claimable.
 */
export function VestingProgressBar({
  schedule,
  clusterTime,
}: VestingProgressBarProps) {
  if (clusterTime === null) {
    return (
      <p role="status" aria-label="Cargando tiempo del cluster">
        Obteniendo Clock del cluster…
      </p>
    );
  }

  const vested = vestedAmount(clusterTime, schedule);
  const claimable = withdrawableAmount(vested, schedule.releasedAmount);
  const pct = vestingProgressPercent(vested, schedule.totalAmount);
  const beforeCliff = clusterTime < schedule.cliffTime;

  return (
    <div className="progress-block">
      <div
        role="progressbar"
        aria-label="Progreso de vesting"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="progress-track"
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="progress-stats" aria-label="Detalle de unlock">
        <li>Cluster time: {clusterTime}</li>
        <li>
          Vested: {vested.toString()} / {schedule.totalAmount.toString()} ({pct}
          %)
        </li>
        <li>Released: {schedule.releasedAmount.toString()}</li>
        <li>Claimable: {claimable.toString()}</li>
        {beforeCliff ? <li>Estado: antes del cliff</li> : null}
      </ul>
    </div>
  );
}
