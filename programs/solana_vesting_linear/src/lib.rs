//! Programa Anchor: vesting lineal de tokens (SPL Token / Token-2022).
//!
//! Fase 1: estado `VestingAccount`, errores y seeds PDA.
//! Las instrucciones reales de vesting llegan en fases 2–4.

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

    /// @notice Smoke / bootstrap: confirma que el programa está desplegado.
    /// @dev Sin cuentas ni estado. Sustituido en Fase 2 por el initialize real.
    /// @param ctx Contexto vacío (`Initialize`).
    /// @return Result<()> Ok si la instrucción se ejecutó.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }
}
