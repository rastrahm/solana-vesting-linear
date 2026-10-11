# Sealevel mitigations — solana-vesting-linear

Reference of Solana Program Security Guide / Sealevel Attacks vectors  
covered in **Phase 5** (`tests/sealevel_security.ts` + Rust tests in `math.rs`).

---

## 1. Type cosplay / account injection

| Attack | Mitigation |
|--------|------------|
| Passing an arbitrary account (system account, spoofed data) as `vesting_account` | `Account<'info, VestingAccount>` requires owner = program + Anchor discriminator |
| Spoofing the vault with any token account | PDA seeds `["vault", vesting.key]` + `token::authority = vesting_account` |

**Test:** `type cosplay: vesting_account falso → …`

---

## 2. Unchecked signers / account substitution (CPI)

| Attack | Mitigation |
|--------|------------|
| Impostor signs `claim` | `beneficiary: Signer` + `has_one = beneficiary` + PDA seeds including beneficiary |
| Replacing the vault with another token account | Vault `seeds` + `bump`; fails with `ConstraintSeeds` |
| Replacing `token_program` | `Interface<'info, TokenInterface>` / owner checks on the `transfer_checked` CPI |
| Vault authority | Only the vesting PDA signs the CPI (`new_with_signer` + seeds) |

**Tests:** `account substitution: vault no-PDA`, `unchecked signer: impostor`, `CPI substitution: token_program incorrecto`

---

## 3. Duplicate account attack (cancel)

| Attack | Mitigation |
|--------|------------|
| `sender == beneficiary` | `constraint = sender.key() != beneficiary.key()` |
| Same ATA for both destinations | `constraint = beneficiary_token_account.key() != sender_token_account.key()` |
| Inconsistent seeds when duplicating roles | `has_one` + seeds `[vesting, sender, beneficiary, mint]` |

**Tests:** `duplicate accounts: sender==beneficiary`, `duplicate accounts: misma ATA…`

---

## 4. Overflow & precision loss

| Attack / edge case | Mitigation |
|--------------------|------------|
| `total_amount * elapsed` u64 overflow | Checked `u128` multiplication (`math::vested_amount`) |
| `released > vested` | `checked_sub` → `MathOverflow` |
| `duration == 0` mid-stream | `checked_div` → `MathOverflow` (defense in depth) |
| `start == cliff == end` | `current >= end` branch → `total_amount` (no division) |

**Rust tests:** `u64_max_mid_duration_no_overflow`, `withdrawable_underflow_errors`, `zero_duration_*`  
**TS test:** `precision: duration 0 post-end → claim total`

---

## 5. Reinitialization after close

| Attack | Mitigation |
|--------|------------|
| Using "ghost" data after cancel | `close = sender` on vesting + vault `close_account` (account = `null`) |
| Claim/cancel on a closed account | `AccountNotInitialized` / seeds fail |
| Re-init with the same seeds | Allowed and **clean**: `init` writes fresh state (released=0, new params) |

**Test:** `reinit tras close: claim falla; initialize recrea estado limpio`

---

## Key constraints summary

```text
Vesting PDA: ["vesting", sender, beneficiary, mint]
Vault  PDA: ["vault", vesting_account]

Claim:  Signer(beneficiary) + has_one + Clock sysvar
Cancel: Signer(sender) + cancelable + sender≠beneficiary + distinct ATAs + close
Math:   Clock only; u128 checked; no client timestamps
```

> Test names are kept in their original (Spanish) form so they match the output of `anchor test`.
