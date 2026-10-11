# Diagrama de clases — solana-vesting-linear

Vista estructural del dominio on-chain (Anchor) y de la capa frontend (Next.js).  
Sintaxis: Mermaid `classDiagram`.

---

## 1. Dominio on-chain (programa Anchor)

```mermaid
classDiagram
    direction TB

    class SolanaVestingLinear {
        <<program>>
        +initialize(ctx, start, cliff, end, amount, cancelable) Result~()~
        +claim(ctx) Result~()~
        +cancel(ctx) Result~()~
    }

    class VestingAccount {
        <<account / repr(C) / InitSpace>>
        +sender: Pubkey
        +beneficiary: Pubkey
        +mint: Pubkey
        +start_time: i64
        +cliff_time: i64
        +end_time: i64
        +total_amount: u64
        +released_amount: u64
        +cancelable: bool
        +bump: u8
        +vault_bump: u8
        +vested_amount(now: i64) Result~u64~
        +withdrawable(now: i64) Result~u64~
    }

    class VestingError {
        <<error_code>>
        InvalidVestingSchedule
        MathOverflow
        NothingToClaim
        NotCancelable
        Unauthorized
        InvalidAmount
    }

    class Initialize {
        <<Accounts>>
        +sender: Signer
        +beneficiary: UncheckedAccount
        +mint: InterfaceAccount~Mint~
        +vesting_account: Account~VestingAccount~
        +vault: InterfaceAccount~TokenAccount~
        +sender_token_account: InterfaceAccount~TokenAccount~
        +token_program: Interface~TokenInterface~
        +system_program: Program~System~
    }

    class Claim {
        <<Accounts>>
        +beneficiary: Signer
        +vesting_account: Account~VestingAccount~
        +vault: InterfaceAccount~TokenAccount~
        +beneficiary_token_account: InterfaceAccount~TokenAccount~
        +mint: InterfaceAccount~Mint~
        +token_program: Interface~TokenInterface~
    }

    class Cancel {
        <<Accounts>>
        +sender: Signer
        +beneficiary: UncheckedAccount
        +vesting_account: Account~VestingAccount~
        +vault: InterfaceAccount~TokenAccount~
        +sender_token_account: InterfaceAccount~TokenAccount~
        +beneficiary_token_account: InterfaceAccount~TokenAccount~
        +mint: InterfaceAccount~Mint~
        +token_program: Interface~TokenInterface~
    }

    class Clock {
        <<sysvar>>
        +unix_timestamp: i64
    }

    class VaultPDA {
        <<PDA TokenAccount>>
        seeds: ["vault", vesting.key]
        authority: vesting PDA
    }

    SolanaVestingLinear --> Initialize : usa
    SolanaVestingLinear --> Claim : usa
    SolanaVestingLinear --> Cancel : usa
    SolanaVestingLinear --> VestingError : retorna

    Initialize --> VestingAccount : init + escribe
    Initialize --> VaultPDA : crea + deposita
    Claim --> VestingAccount : lee/actualiza released
    Claim --> VaultPDA : transfiere vested
    Claim --> Clock : lee tiempo
    Cancel --> VestingAccount : lee + close
    Cancel --> VaultPDA : reparte + close
    Cancel --> Clock : calcula vested

    VestingAccount ..> VestingError : MathOverflow / schedule
    VestingAccount --> VaultPDA : authority PDA
```

### Notas de diseño

| Elemento | Decisión |
|----------|----------|
| `VestingAccount` | `#[repr(C)]` + `InitSpace`; espacio = `8 + INIT_SPACE` |
| Tokens | `token_interface` → SPL Token y Token-2022 |
| Reloj | Solo `Clock` sysvar; nunca timestamp del cliente |
| Cierre | `close = sender` en cancel / claim completo |

---

## 2. Capa frontend (Next.js / React)

```mermaid
classDiagram
    direction TB

    class ThemeProvider {
        <<client>>
        -theme: "light" | "dark"
        +toggleTheme()
        +persist(localStorage)
        +detectSystem(prefers-color-scheme)
    }

    class WalletProvider {
        <<client>>
        +connection: Connection
        +wallet: WalletContextState
    }

    class CreateVestingForm {
        <<client>>
        +schema: ZodSchema
        +onSubmit(values)
    }

    class ClaimButton {
        <<client>>
        +vestingPubkey: PublicKey
        +onClaim()
    }

    class CancelButton {
        <<client>>
        +vestingPubkey: PublicKey
        +onCancel()
    }

    class VestingProgressBar {
        <<client>>
        +start: i64
        +cliff: i64
        +end: i64
        +released: u64
        +total: u64
        +clusterTime: i64
    }

    class HelpModal {
        <<client>>
        +explainCliff()
        +explainLinearUnlock()
        +explainRevocability()
    }

    class TxStatusBanner {
        <<client>>
        +status: Pending | Success | Failed
    }

    class VestingProgramClient {
        <<hook / lib>>
        +initialize(...)
        +claim(...)
        +cancel(...)
        +fetchVesting(pubkey)
    }

    ThemeProvider --> CreateVestingForm : tema
    WalletProvider --> CreateVestingForm : firma
    WalletProvider --> ClaimButton
    WalletProvider --> CancelButton
    VestingProgramClient --> CreateVestingForm
    VestingProgramClient --> ClaimButton
    VestingProgramClient --> CancelButton
    VestingProgramClient --> VestingProgressBar : datos on-chain
    HelpModal --> CreateVestingForm : onboarding
    TxStatusBanner --> VestingProgramClient : feedback tx
```

### Contratos de tipado (frontend)

- Props y retornos tipados; **sin `any`**.
- Formularios y params validados con **Zod**.
- Cada componente/hook con **JSDoc** (`@description`, `@param`, `@returns`).
