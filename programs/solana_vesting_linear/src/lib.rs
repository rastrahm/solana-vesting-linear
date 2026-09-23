//! Programa Anchor: vesting lineal de tokens (SPL Token / Token-2022).
//!
//! Fase 2: `initialize` crea schedule, vault PDA y deposita tokens.

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba");

/// Entrypoint del programa `solana_vesting_linear`.
#[program]
pub mod solana_vesting_linear {
    use super::*;

    /// @notice Crea un vesting lineal, inicializa el vault PDA y deposita `amount`.
    /// @dev Valida schedule/amount; persiste `VestingAccount` y transfiere al vault.
    /// @param ctx Cuentas Initialize (sender, beneficiary, mint, vesting, vault, …).
    /// @param start_time Unix de inicio.
    /// @param cliff_time Unix del cliff.
    /// @param end_time Unix de fin.
    /// @param amount Tokens a depositar (> 0).
    /// @param cancelable Si el sender podrá cancelar.
    /// @return Result<()> Ok si estado y depósito fueron exitosos.
    pub fn initialize(
        ctx: Context<Initialize>,
        start_time: i64,
        cliff_time: i64,
        end_time: i64,
        amount: u64,
        cancelable: bool,
    ) -> Result<()> {
        initialize::handler(ctx, start_time, cliff_time, end_time, amount, cancelable)
    }
}
