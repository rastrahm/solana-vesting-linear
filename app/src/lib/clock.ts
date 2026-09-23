/**
 * @description Lectura del unix timestamp desde el Clock sysvar del cluster.
 */
import { Connection, PublicKey } from "@solana/web3.js";

/** Sysvar Clock. */
export const SYSVAR_CLOCK = new PublicKey(
  "SysvarC1ock11111111111111111111111111111111"
);

/**
 * @description Obtiene `unix_timestamp` on-chain (no el reloj del browser).
 * @param connection Conexión RPC Solana.
 * @returns Unix seconds del cluster.
 */
export async function getClusterUnixTimestamp(
  connection: Connection
): Promise<number> {
  const info = await connection.getAccountInfo(SYSVAR_CLOCK, "confirmed");
  if (!info?.data || info.data.length < 40) {
    throw new Error("No se pudo leer Clock sysvar");
  }
  // Layout: slot(u64), epoch_start_timestamp(i64), epoch(u64), leader_schedule_epoch(u64), unix_timestamp(i64@32)
  const view = new DataView(
    info.data.buffer,
    info.data.byteOffset,
    info.data.byteLength
  );
  return Number(view.getBigInt64(32, true));
}
