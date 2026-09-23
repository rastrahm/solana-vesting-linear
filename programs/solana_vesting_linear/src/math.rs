//! Cálculo de vesting lineal con aritmética checked (u128).

use anchor_lang::prelude::*;

use crate::error::VestingError;

/// @notice Calcula tokens ya vestidos según el Clock del cluster.
/// @dev Antes del cliff → 0; desde `end_time` → `total_amount`; entre medias unlock lineal desde `start_time`.
/// @param current_time Unix timestamp (`Clock::get()?.unix_timestamp`).
/// @param start_time Inicio del schedule.
/// @param cliff_time Fin del cliff.
/// @param end_time Fin del vesting.
/// @param total_amount Monto total del vesting.
/// @return Result<u64> Cantidad vestida o `MathOverflow`.
pub fn vested_amount(
    current_time: i64,
    start_time: i64,
    cliff_time: i64,
    end_time: i64,
    total_amount: u64,
) -> Result<u64> {
    if current_time < cliff_time {
        return Ok(0);
    }
    if current_time >= end_time {
        return Ok(total_amount);
    }

    let duration = end_time
        .checked_sub(start_time)
        .ok_or(VestingError::MathOverflow)?;
    let elapsed = current_time
        .checked_sub(start_time)
        .ok_or(VestingError::MathOverflow)?;

    // duration == 0: división inválida (schedule degenerado mid-stream).
    let vested = (total_amount as u128)
        .checked_mul(elapsed as u128)
        .ok_or(VestingError::MathOverflow)?
        .checked_div(duration as u128)
        .ok_or(VestingError::MathOverflow)? as u64;

    Ok(vested)
}

/// @notice Tokens claimables = vested − already released.
/// @param vested Resultado de [`vested_amount`].
/// @param released_amount Acumulado ya reclamado.
/// @return Result<u64> Withdrawable o `MathOverflow` si underflow.
pub fn withdrawable_amount(vested: u64, released_amount: u64) -> Result<u64> {
    vested
        .checked_sub(released_amount)
        .ok_or_else(|| error!(VestingError::MathOverflow))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn before_cliff_is_zero() {
        let vested = vested_amount(50, 0, 100, 200, 1_000).unwrap();
        assert_eq!(vested, 0);
    }

    #[test]
    fn at_or_after_end_is_total() {
        assert_eq!(vested_amount(200, 0, 50, 200, 1_000).unwrap(), 1_000);
        assert_eq!(vested_amount(250, 0, 50, 200, 1_000).unwrap(), 1_000);
    }

    #[test]
    fn mid_duration_is_exact_half() {
        // start=0, end=1000, now=500 → 50% de 1_000_000
        let vested = vested_amount(500, 0, 0, 1000, 1_000_000).unwrap();
        assert_eq!(vested, 500_000);
    }

    #[test]
    fn withdrawable_subtracts_released() {
        assert_eq!(withdrawable_amount(500, 200).unwrap(), 300);
    }

    #[test]
    fn zero_duration_mid_stream_errors() {
        // now en (cliff, end) con duration = end - start = 0 → MathOverflow en div.
        assert!(vested_amount(75, 100, 50, 100, 1_000).is_err());
    }
}