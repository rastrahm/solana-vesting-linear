//! Instruction `cancel` — revoca el vesting y cierra vault + estado.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
    TransferChecked,
};

use crate::constants::{VAULT_SEED, VESTING_SEED};
use crate::error::VestingError;
use crate::math::{vested_amount, withdrawable_amount};
use crate::state::VestingAccount;

/// Cuentas para cancelar un vesting revocable.
#[derive(Accounts)]
pub struct Cancel<'info> {
    /// Creador del vesting; único autorizado a cancelar; recibe rent al cerrar.
    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: Validado con `has_one = beneficiary` sobre el estado; no se leen datos.
    /// Debe ser distinto de `sender` (mitiga duplicate-account).
    pub beneficiary: UncheckedAccount<'info>,

    /// Estado del schedule; se cierra y los lamports vuelven al sender.
    #[account(
        mut,
        close = sender,
        seeds = [
            VESTING_SEED.as_bytes(),
            sender.key().as_ref(),
            beneficiary.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump = vesting_account.bump,
        has_one = sender @ VestingError::Unauthorized,
        has_one = beneficiary @ VestingError::Unauthorized,
        has_one = mint @ VestingError::Unauthorized,
        constraint = vesting_account.cancelable @ VestingError::NotCancelable,
        constraint = sender.key() != beneficiary.key() @ VestingError::Unauthorized
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    /// Vault PDA; se vacía y se cierra hacia el sender.
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), vesting_account.key().as_ref()],
        bump = vesting_account.vault_bump,
        token::mint = mint,
        token::authority = vesting_account,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// Destino de tokens no vestidos.
    #[account(
        mut,
        token::mint = mint,
        token::authority = sender,
        token::token_program = token_program,
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Destino de tokens ya vestidos (y aún no released).
    #[account(
        mut,
        token::mint = mint,
        token::authority = beneficiary,
        token::token_program = token_program,
        constraint = beneficiary_token_account.key() != sender_token_account.key() @ VestingError::Unauthorized
    )]
    pub beneficiary_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

/// @notice Cancela el vesting: vested→beneficiary, unvested→sender; cierra vault y estado.
/// @dev Solo `sender` si `cancelable`; tiempo vía `Clock`; firma CPI con seeds del vesting PDA.
/// @param ctx Cuentas Cancel (sender signer, beneficiary, vesting, vault, ATAs, mint, token program).
/// @return Result<()> Ok si payouts y cierres fueron exitosos.
pub fn handler(ctx: Context<Cancel>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    let vesting = &ctx.accounts.vesting_account;
    let vested = vested_amount(
        current_time,
        vesting.start_time,
        vesting.cliff_time,
        vesting.end_time,
        vesting.total_amount,
    )?;
    let to_beneficiary = withdrawable_amount(vested, vesting.released_amount)?;
    let to_sender = vesting
        .total_amount
        .checked_sub(vested)
        .ok_or(VestingError::MathOverflow)?;

    let sender_key = vesting.sender;
    let beneficiary_key = vesting.beneficiary;
    let mint_key = vesting.mint;
    let bump = vesting.bump;
    let decimals = ctx.accounts.mint.decimals;

    let bump_seed = [bump];
    let seeds: &[&[u8]] = &[
        VESTING_SEED.as_bytes(),
        sender_key.as_ref(),
        beneficiary_key.as_ref(),
        mint_key.as_ref(),
        &bump_seed,
    ];
    let signer = &[seeds];

    if to_beneficiary > 0 {
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.beneficiary_token_account.to_account_info(),
                    authority: ctx.accounts.vesting_account.to_account_info(),
                },
                signer,
            ),
            to_beneficiary,
            decimals,
        )?;
    }

    if to_sender > 0 {
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.sender_token_account.to_account_info(),
                    authority: ctx.accounts.vesting_account.to_account_info(),
                },
                signer,
            ),
            to_sender,
            decimals,
        )?;
    }

    close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.sender.to_account_info(),
            authority: ctx.accounts.vesting_account.to_account_info(),
        },
        signer,
    ))?;

    // `vesting_account` se cierra vía `close = sender` al final de la instrucción.
    Ok(())
}
