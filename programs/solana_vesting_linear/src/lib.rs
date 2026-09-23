//! Programa Anchor: vesting lineal de tokens (SPL Token / Token-2022).
//!
//! Fase 4: `cancel` revoca, reparte tokens y cierra vault + estado.

pub mod constants;
pub mod error;
pub mod instructions;
pub mod math;
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

    /// @notice Beneficiary reclama tokens ya vestidos (`vested - released`).
    /// @dev Tiempo solo desde `Clock` sysvar; no acepta timestamp del cliente.
    /// @param ctx Cuentas Claim (beneficiary signer, vesting, vault, ATA beneficiary, mint).
    /// @return Result<()> Ok si la transferencia y el update de `released_amount` fueron exitosos.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        claim::handler(ctx)
    }

    /// @notice Sender cancela un vesting revocable y cierra vault + estado.
    /// @dev Vested → beneficiary; unvested → sender; lamports de cierre → sender.
    /// @param ctx Cuentas Cancel (sender signer, beneficiary, vesting, vault, ATAs, mint).
    /// @return Result<()> Ok si payouts y cierres fueron exitosos.
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        cancel::handler(ctx)
    }
}
