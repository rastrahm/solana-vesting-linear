//! Constantes y seeds PDA del programa de vesting lineal.
//!
//! ## Seeds (deterministas)
//!
//! | PDA | Seeds | Authority / uso |
//! |-----|-------|-----------------|
//! | `VestingAccount` | `["vesting", sender, beneficiary, mint]` | Estado del schedule |
//! | Vault (token) | `["vault", vesting_account.key()]` | Custodia de tokens; authority = vesting PDA |
//!
//! El vault se deriva del pubkey del vesting para un único vault por schedule
//! y evitar colisiones entre mints/beneficiarios distintos.

use anchor_lang::prelude::*;

/// Prefijo PDA de la cuenta de estado `VestingAccount`.
/// Seeds completas: `[VESTING_SEED, sender, beneficiary, mint]`.
#[constant]
pub const VESTING_SEED: &str = "vesting";

/// Prefijo PDA del vault de tokens.
/// Seeds completas: `[VAULT_SEED, vesting_account.key()]`.
#[constant]
pub const VAULT_SEED: &str = "vault";

/// Bytes de datos de `VestingAccount` sin discriminador (`InitSpace`).
/// Espacio total de cuenta = `8 + VESTING_ACCOUNT_DATA_LEN`.
#[constant]
pub const VESTING_ACCOUNT_DATA_LEN: u16 = 139;
