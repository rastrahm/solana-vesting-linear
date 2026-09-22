//! Errores del programa. Catálogo completo en Fase 1.

use anchor_lang::prelude::*;

/// Errores custom del vesting lineal.
#[error_code]
pub enum VestingError {
    /// Placeholder de Fase 0; se reemplaza en Fase 1.
    #[msg("Bootstrap placeholder error")]
    BootstrapPlaceholder,
}
