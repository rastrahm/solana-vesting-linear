/**
 * @description Derivación de PDAs vesting y vault (seeds documentadas).
 */
import { PublicKey } from "@solana/web3.js";

/**
 * @description Deriva PDAs de estado y vault.
 * @param programId Program id del vesting.
 * @param sender Pubkey del creador.
 * @param beneficiary Pubkey del beneficiario.
 * @param mint Mint SPL.
 * @returns PDAs y bumps.
 */
export function deriveVestingPdas(
  programId: PublicKey,
  sender: PublicKey,
  beneficiary: PublicKey,
  mint: PublicKey
): {
  vestingAccount: PublicKey;
  vestingBump: number;
  vault: PublicKey;
  vaultBump: number;
} {
  const [vestingAccount, vestingBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vesting"),
      sender.toBuffer(),
      beneficiary.toBuffer(),
      mint.toBuffer(),
    ],
    programId
  );
  const [vault, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vestingAccount.toBuffer()],
    programId
  );
  return { vestingAccount, vestingBump, vault, vaultBump };
}
