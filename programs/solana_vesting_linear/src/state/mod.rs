//! Cuentas de estado on-chain del vesting lineal.

use anchor_lang::prelude::*;

/// Estado de un schedule de vesting lineal con cliff y revocación opcional.
///
/// Layout estricto C-ABI (`#[repr(C)]`), campos por alineación descendente
/// (32 → 8 → 1) para eliminar padding interno.
///
/// Espacio de cuenta: `8` (discriminador Anchor) + [`VestingAccount::INIT_SPACE`] (= 139).
#[account]
#[repr(C)]
#[derive(InitSpace)]
pub struct VestingAccount {
    /// Creador / pagador original; único autorizado a `cancel` si `cancelable`.
    pub sender: Pubkey,
    /// Destinatario de tokens vestidos; único autorizado a `claim`.
    pub beneficiary: Pubkey,
    /// Mint SPL Token / Token-2022 del vesting.
    pub mint: Pubkey,
    /// Inicio del vesting (unix timestamp). Base del unlock lineal.
    pub start_time: i64,
    /// Fin del cliff: antes de este instante no hay tokens claimables.
    pub cliff_time: i64,
    /// Fin del vesting: a partir de aquí `vested == total_amount`.
    pub end_time: i64,
    /// Cantidad total depositada en el vault.
    pub total_amount: u64,
    /// Acumulado ya reclamado por el beneficiary.
    pub released_amount: u64,
    /// Si `true`, el sender puede invocar `cancel`.
    pub cancelable: bool,
    /// Bump PDA de esta cuenta (`["vesting", sender, beneficiary, mint]`).
    pub bump: u8,
    /// Bump PDA del vault (`["vault", vesting_account.key()]`).
    pub vault_bump: u8,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::VESTING_ACCOUNT_DATA_LEN;

    /// @notice Garantiza el tamaño exacto del estado (criterio Fase 1).
    #[test]
    fn vesting_account_init_space_is_139() {
        assert_eq!(VestingAccount::INIT_SPACE, 139);
        assert_eq!(VestingAccount::INIT_SPACE, VESTING_ACCOUNT_DATA_LEN as usize);
    }

    /// @notice Espacio total de cuenta = discriminador + InitSpace.
    #[test]
    fn vesting_account_total_space_is_147() {
        assert_eq!(8 + VestingAccount::INIT_SPACE, 147);
    }

    /// @notice Verifica el orden de campos por tamaño (Pubkey → i64/u64 → bool/u8).
    #[test]
    fn vesting_account_field_offsets_follow_alignment_rule() {
        use std::mem::offset_of;

        assert_eq!(offset_of!(VestingAccount, sender), 0);
        assert_eq!(offset_of!(VestingAccount, beneficiary), 32);
        assert_eq!(offset_of!(VestingAccount, mint), 64);
        assert_eq!(offset_of!(VestingAccount, start_time), 96);
        assert_eq!(offset_of!(VestingAccount, cliff_time), 104);
        assert_eq!(offset_of!(VestingAccount, end_time), 112);
        assert_eq!(offset_of!(VestingAccount, total_amount), 120);
        assert_eq!(offset_of!(VestingAccount, released_amount), 128);
        assert_eq!(offset_of!(VestingAccount, cancelable), 136);
        assert_eq!(offset_of!(VestingAccount, bump), 137);
        assert_eq!(offset_of!(VestingAccount, vault_bump), 138);
    }
}
