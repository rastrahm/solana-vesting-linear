//! Errores custom del programa de vesting lineal.

use anchor_lang::prelude::*;

/// Catálogo de errores on-chain.
#[error_code]
pub enum VestingError {
    /// Schedule inválido: se requiere `start_time <= cliff_time <= end_time`.
    #[msg("Invalid vesting schedule: require start_time <= cliff_time <= end_time")]
    InvalidVestingSchedule,

    /// Desbordamiento o división inválida en aritmética checked (`u64`/`u128`/`i64`).
    #[msg("Arithmetic overflow or invalid math operation")]
    MathOverflow,

    /// No hay tokens claimables (antes del cliff o ya todo liberado).
    #[msg("Nothing to claim at the current time")]
    NothingToClaim,

    /// El vesting no permite revocación (`cancelable == false`).
    #[msg("Vesting schedule is not cancelable")]
    NotCancelable,

    /// El firmante no tiene autoridad para esta instrucción.
    #[msg("Unauthorized signer for this instruction")]
    Unauthorized,

    /// `total_amount` debe ser mayor que cero.
    #[msg("Vesting amount must be greater than zero")]
    InvalidAmount,
}
