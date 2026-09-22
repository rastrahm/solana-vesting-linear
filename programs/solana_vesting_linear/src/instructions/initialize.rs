//! Instruction `initialize` — stub de bootstrap (Fase 0).

use anchor_lang::prelude::*;

/// Cuentas de `initialize` (vacío en Fase 0).
#[derive(Accounts)]
pub struct Initialize {}

/// @notice Ejecuta el smoke initialize del bootstrap.
/// @dev Emite un log con el program id. Sin mutación de estado.
/// @param ctx Contexto sin cuentas.
/// @return Result<()> Siempre Ok en esta fase.
pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    msg!(
        "solana_vesting_linear bootstrap OK — program_id={}",
        ctx.program_id
    );
    Ok(())
}
