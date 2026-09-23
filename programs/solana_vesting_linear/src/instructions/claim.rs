//! Instruction `claim` — beneficiary retira tokens ya vestidos.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{VAULT_SEED, VESTING_SEED};
use crate::error::VestingError;
use crate::math::{vested_amount, withdrawable_amount};
use crate::state::VestingAccount;

/// Cuentas para reclamar tokens vestidos.
#[derive(Accounts)]
pub struct Claim<'info> {
    /// Beneficiario; debe firmar y coincidir con `vesting_account.beneficiary`.
    pub beneficiary: Signer<'info>,

    /// Estado del schedule.
    #[account(
        mut,
        seeds = [
            VESTING_SEED.as_bytes(),
            vesting_account.sender.as_ref(),
            beneficiary.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump = vesting_account.bump,
        has_one = beneficiary @ VestingError::Unauthorized,
        has_one = mint @ VestingError::Unauthorized,
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    /// Vault PDA con los tokens custodiados.
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), vesting_account.key().as_ref()],
        bump = vesting_account.vault_bump,
        token::mint = mint,
        token::authority = vesting_account,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// Token account del beneficiary (mismo mint).
    #[account(
        mut,
        token::mint = mint,
        token::authority = beneficiary,
        token::token_program = token_program,
    )]
    pub beneficiary_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

/// @notice Transfiere al beneficiary `vested(now) - released_amount`.
/// @dev Usa solo `Clock` sysvar; firma el CPI con seeds del vesting PDA.
/// @param ctx Cuentas Claim (beneficiary signer, vesting, vault, beneficiary ATA, mint, token program).
/// @return Result<()> Ok si hubo claim; `NothingToClaim` si withdrawable == 0.
pub fn handler(ctx: Context<Claim>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    let vesting = &ctx.accounts.vesting_account;
    let vested = vested_amount(
        current_time,
        vesting.start_time,
        vesting.cliff_time,
        vesting.end_time,
        vesting.total_amount,
    )?;
    let withdrawable = withdrawable_amount(vested, vesting.released_amount)?;
    require!(withdrawable > 0, VestingError::NothingToClaim);

    let sender = vesting.sender;
    let beneficiary_key = vesting.beneficiary;
    let mint_key = vesting.mint;
    let bump = vesting.bump;
    let decimals = ctx.accounts.mint.decimals;

    let bump_seed = [bump];
    let seeds: &[&[u8]] = &[
        VESTING_SEED.as_bytes(),
        sender.as_ref(),
        beneficiary_key.as_ref(),
        mint_key.as_ref(),
        &bump_seed,
    ];
    let signer = &[seeds];

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
        withdrawable,
        decimals,
    )?;

    let vesting = &mut ctx.accounts.vesting_account;
    vesting.released_amount = vesting
        .released_amount
        .checked_add(withdrawable)
        .ok_or(VestingError::MathOverflow)?;

    Ok(())
}
