/**
 * @description Esquemas Zod de entorno y formularios de vesting.
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

const pubkeyRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * @description Formulario de creación de vesting lineal.
 */
export const createVestingSchema = z
  .object({
    beneficiary: z
      .string()
      .trim()
      .regex(pubkeyRegex, "Beneficiary debe ser un pubkey válido"),
    mint: z.string().trim().regex(pubkeyRegex, "Mint debe ser un pubkey válido"),
    amount: z.coerce.number().positive("Amount debe ser > 0"),
    decimals: z.coerce.number().int().min(0).max(9).default(6),
    startTime: z.coerce.number().int("startTime unix inválido"),
    cliffTime: z.coerce.number().int("cliffTime unix inválido"),
    endTime: z.coerce.number().int("endTime unix inválido"),
    cancelable: z.boolean().default(true),
  })
  .refine((d) => d.startTime <= d.cliffTime, {
    message: "start_time debe ser ≤ cliff_time",
    path: ["cliffTime"],
  })
  .refine((d) => d.cliffTime <= d.endTime, {
    message: "cliff_time debe ser ≤ end_time",
    path: ["endTime"],
  });

export type CreateVestingInput = z.infer<typeof createVestingSchema>;

/**
 * @description Lookup de un vesting existente (sender + beneficiary + mint).
 */
export const vestingLookupSchema = z.object({
  sender: z.string().trim().regex(pubkeyRegex, "Sender pubkey inválido"),
  beneficiary: z
    .string()
    .trim()
    .regex(pubkeyRegex, "Beneficiary pubkey inválido"),
  mint: z.string().trim().regex(pubkeyRegex, "Mint pubkey inválido"),
});

export type VestingLookupInput = z.infer<typeof vestingLookupSchema>;
