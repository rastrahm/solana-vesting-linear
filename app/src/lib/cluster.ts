/**
 * @description Configuración de cluster Solana leída y validada con Zod.
 */
import { publicEnvSchema, type ClusterName } from "@/lib/schemas";

export interface SolanaClusterConfig {
  cluster: ClusterName;
  rpcUrl: string;
  programId: string;
}

/**
 * @description Resuelve RPC/cluster desde env (valores por defecto = localnet).
 * @returns Config tipada del cluster activo.
 */
export function getSolanaClusterConfig(): SolanaClusterConfig {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_PROGRAM_ID: process.env.NEXT_PUBLIC_PROGRAM_ID,
  });

  const fallbackProgramId =
    "33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba";

  if (!parsed.success) {
    return {
      cluster: "localnet",
      rpcUrl: "http://127.0.0.1:8899",
      programId: fallbackProgramId,
    };
  }

  return {
    cluster: parsed.data.NEXT_PUBLIC_SOLANA_CLUSTER,
    rpcUrl: parsed.data.NEXT_PUBLIC_SOLANA_RPC_URL,
    programId: parsed.data.NEXT_PUBLIC_PROGRAM_ID ?? fallbackProgramId,
  };
}
