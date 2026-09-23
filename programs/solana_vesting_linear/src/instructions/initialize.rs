//! Instruction `initialize` — crea schedule, vault PDA y deposita tokens.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{VAULT_SEED, VESTING_SEED};
use crate::error::VestingError;
use crate::state::VestingAccount;

/// Cuentas para crear un vesting lineal y fondear el vault.
#[derive(Accounts)]
#[instruction(start_time: i64, cliff_time: i64, end_time: i64, amount: u64, cancelable: bool)]
pub struct Initialize<'info> {
    /// Creador del vesting; paga rent y firma el depósito.
    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: Solo se usa como seed PDA y se persiste en estado; no se leen datos.
    pub beneficiary: UncheckedAccount<'info>,

    /// Mint SPL Token o Token-2022 del vesting.
    pub mint: InterfaceAccount<'info, Mint>,

    /// Cuenta de estado del schedule (PDA).
    #[account(
        init,
        payer = sender,
        space = 8 + VestingAccount::INIT_SPACE,
        seeds = [
            VESTING_SEED.as_bytes(),
            sender.key().as_ref(),
            beneficiary.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    /// Vault PDA que custodia los tokens; authority = `vesting_account`.
    #[account(
        init,
        payer = sender,
        seeds = [VAULT_SEED.as_bytes(), vesting_account.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vesting_account,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// ATA (u otra token account) del sender con al menos `amount` tokens.
    #[account(
        mut,
        token::mint = mint,
        token::authority = sender,
        token::token_program = token_program,
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

/// @notice Crea un vesting lineal, inicializa el vault PDA y deposita `amount`.
/// @dev Valida `amount > 0` y `start <= cliff <= end`; CPI `transfer_checked` al vault.
/// @param ctx Cuentas: sender, beneficiary, mint, vesting_account, vault, sender_token_account, token/system programs.
/// @param start_time Unix timestamp de inicio del unlock lineal.
/// @param cliff_time Unix timestamp del cliff (sin claim antes).
/// @param end_time Unix timestamp de fin (100% vested).
/// @param amount Cantidad total a depositar (> 0).
/// @param cancelable Si el sender podrá invocar `cancel` después.
/// @return Result<()> Ok si el estado quedó persistido y el vault tiene `amount`.
pub fn handler(
    ctx: Context<Initialize>,
    start_time: i64,
    cliff_time: i64,
    end_time: i64,
    amount: u64,
    cancelable: bool,
) -> Result<()> {
    require!(amount > 0, VestingError::InvalidAmount);
    require!(
        start_time <= cliff_time && cliff_time <= end_time,
        VestingError::InvalidVestingSchedule
    );

    let vesting = &mut ctx.accounts.vesting_account;
    vesting.sender = ctx.accounts.sender.key();
    vesting.beneficiary = ctx.accounts.beneficiary.key();
    vesting.mint = ctx.accounts.mint.key();
    vesting.start_time = start_time;
    vesting.cliff_time = cliff_time;
    vesting.end_time = end_time;
    vesting.total_amount = amount;
    vesting.released_amount = 0;
    vesting.cancelable = cancelable;
    vesting.bump = ctx.bumps.vesting_account;
    vesting.vault_bump = ctx.bumps.vault;

    let decimals = ctx.accounts.mint.decimals;
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.sender_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        ),
        amount,
        decimals,
    )?;

    Ok(())
}
