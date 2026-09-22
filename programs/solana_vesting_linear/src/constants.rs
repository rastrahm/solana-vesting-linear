//! Constantes del programa (seeds PDA se definirán en Fase 1–2).

use anchor_lang::prelude::*;

/// Seed provisional de bootstrap (no usar en producción de vesting).
#[constant]
pub const SEED: &str = "vesting_bootstrap";
