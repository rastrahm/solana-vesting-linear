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
        let vested = vested_amount(500, 0, 0, 1000, 1_000_000).unwrap();
        assert_eq!(vested, 500_000);
    }

    #[test]
    fn withdrawable_subtracts_released() {
        assert_eq!(withdrawable_amount(500, 200).unwrap(), 300);
    }

    #[test]
    fn zero_duration_mid_stream_errors() {
        assert!(vested_amount(75, 100, 50, 100, 1_000).is_err());
    }

    #[test]
    fn u64_max_mid_duration_no_overflow() {
        let half = vested_amount(500, 0, 0, 1000, u64::MAX).unwrap();
        assert_eq!(half, u64::MAX / 2);
    }

    #[test]
    fn u64_max_at_end_is_total() {
        assert_eq!(
            vested_amount(1000, 0, 0, 1000, u64::MAX).unwrap(),
            u64::MAX
        );
    }

    #[test]
    fn withdrawable_underflow_errors() {
        assert!(withdrawable_amount(100, 200).is_err());
    }

    #[test]
    fn zero_duration_at_or_after_end_returns_total() {
        assert_eq!(vested_amount(100, 100, 100, 100, 999).unwrap(), 999);
        assert_eq!(vested_amount(101, 100, 100, 100, 999).unwrap(), 999);
    }
}
