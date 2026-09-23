/**
 * @description Factory del Program Anchor tipado + helpers de montos.
 */
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import idl from "@/idl/solana_vesting_linear.json";
import type { SolanaVestingLinear } from "@/idl/solana_vesting_linear";
import { getSolanaClusterConfig } from "@/lib/cluster";
import { deriveVestingPdas } from "@/lib/pdas";

/**
 * @description Program id efectivo (env o IDL).
 * @returns PublicKey del programa.
 */
export function getProgramId(): PublicKey {
  const { programId } = getSolanaClusterConfig();
  return new PublicKey(programId);
}

/**
 * @description Instancia Program con el provider del wallet.
 * @param provider AnchorProvider (wallet + connection).
 * @returns Program tipado.
 */
export function getVestingProgram(
  provider: AnchorProvider
): Program<SolanaVestingLinear> {
  return new Program(idl as SolanaVestingLinear, provider);
}

/**
 * @description Convierte amount humano a unidades enteras del mint.
 * @param amount Cantidad decimal (ej. 1000.5).
 * @param decimals Decimales del mint.
 * @returns BN para instrucciones.
 */
export function toTokenAmount(amount: number, decimals: number): BN {
  const factor = 10 ** decimals;
  return new BN(Math.round(amount * factor).toString());
}

/**
 * @description Asegura ATA del owner (instrucción idempotente si falta).
 * @param connection RPC.
 * @param payer Pagador de rent.
 * @param mint Mint.
 * @param owner Owner de la ATA.
 * @returns Address ATA + instrucción opcional.
 */
export async function ensureAtaIx(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey
): Promise<{ ata: PublicKey; ix: TransactionInstruction | null }> {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const info = await connection.getAccountInfo(ata);
  if (info) {
    return { ata, ix: null };
  }
  return {
    ata,
    ix: createAssociatedTokenAccountIdempotentInstruction(
      payer,
      ata,
      owner,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),
  };
}

export { deriveVestingPdas, TOKEN_PROGRAM_ID };
