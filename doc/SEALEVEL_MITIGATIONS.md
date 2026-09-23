# Mitigaciones Sealevel — solana-vesting-linear

Referencia de vectores del Solana Program Security Guide / Sealevel Attacks  
cubiertos en **Fase 5** (`tests/sealevel_security.ts` + tests Rust en `math.rs`).

---

## 1. Type cosplay / account injection

| Ataque | Mitigación |
|--------|------------|
| Pasar una cuenta arbitraria (system account, datos spoof) como `vesting_account` | `Account<'info, VestingAccount>` exige owner = programa + discriminador Anchor |
| Spoof de vault como token account cualquiera | Seeds PDA `["vault", vesting.key]` + `token::authority = vesting_account` |

**Test:** `type cosplay: vesting_account falso → …`

---

## 2. Unchecked signers / account substitution (CPI)

| Ataque | Mitigación |
|--------|------------|
| Impostor firma `claim` | `beneficiary: Signer` + `has_one = beneficiary` + seeds PDA con beneficiary |
| Sustituir vault por otra token account | `seeds` + `bump` del vault; falla `ConstraintSeeds` |
| Sustituir `token_program` | `Interface<'info, TokenInterface>` / owner checks en CPI `transfer_checked` |
| Authority del vault | Solo el PDA vesting firma CPI (`new_with_signer` + seeds) |

**Tests:** `account substitution: vault no-PDA`, `unchecked signer: impostor`, `CPI substitution: token_program incorrecto`

---

## 3. Duplicate account attack (cancel)

| Ataque | Mitigación |
|--------|------------|
| `sender == beneficiary` | `constraint = sender.key() != beneficiary.key()` |
| Misma ATA para ambos destinos | `constraint = beneficiary_token_account.key() != sender_token_account.key()` |
| Seeds inconsistentes al duplicar roles | `has_one` + seeds `[vesting, sender, beneficiary, mint]` |

**Tests:** `duplicate accounts: sender==beneficiary`, `duplicate accounts: misma ATA…`

---

## 4. Overflow & precision loss

| Ataque / borde | Mitigación |
|----------------|------------|
| `total_amount * elapsed` overflow u64 | Multiplicación en `u128` checked (`math::vested_amount`) |
| `released > vested` | `checked_sub` → `MathOverflow` |
| `duration == 0` mid-stream | `checked_div` → `MathOverflow` (defensa en profundidad) |
| `start == cliff == end` | Rama `current >= end` → `total_amount` (sin división) |

**Tests Rust:** `u64_max_mid_duration_no_overflow`, `withdrawable_underflow_errors`, `zero_duration_*`  
**Test TS:** `precision: duration 0 post-end → claim total`

---

## 5. Reinitialization tras close

| Ataque | Mitigación |
|--------|------------|
| Usar datos “fantasma” tras cancel | `close = sender` en vesting + `close_account` del vault (cuenta = `null`) |
| Claim/cancel sobre cuenta cerrada | `AccountNotInitialized` / seeds fail |
| Re-init con mismas seeds | Permitido y **limpio**: `init` escribe estado nuevo (released=0, nuevos params) |

**Test:** `reinit tras close: claim falla; initialize recrea estado limpio`

---

## Resumen de constraints clave

```text
Vesting PDA: ["vesting", sender, beneficiary, mint]
Vault  PDA: ["vault", vesting_account]

Claim:  Signer(beneficiary) + has_one + Clock sysvar
Cancel: Signer(sender) + cancelable + sender≠beneficiary + ATAs distintas + close
Math:   Clock only; u128 checked; no client timestamps
```
