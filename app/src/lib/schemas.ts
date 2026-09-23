/**
 * @description Esquemas Zod base (Fase 6); formularios de vesting en Fase 7.
 */
import { z } from "zod";

/** Cluster permitido para la UI. */
export const clusterSchema = z.enum(["localnet", "devnet", "mainnet-beta"]);

export type ClusterName = z.infer<typeof clusterSchema>;

/**
 * @description Valida variables de entorno públicas del frontend.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SOLANA_CLUSTER: clusterSchema.default("localnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url().default("http://127.0.0.1:8899"),
  NEXT_PUBLIC_PROGRAM_ID: z.string().min(32).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
