# Class diagram — solana-vesting-linear

Structural view of the on-chain domain (Anchor) and the frontend layer (Next.js).  
Syntax: Mermaid `classDiagram`.

---

## 1. On-chain domain (Anchor program)

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

    SolanaVestingLinear --> Initialize : uses
    SolanaVestingLinear --> Claim : uses
    SolanaVestingLinear --> Cancel : uses
    SolanaVestingLinear --> VestingError : returns

    Initialize --> VestingAccount : init + write
    Initialize --> VaultPDA : create + deposit
    Claim --> VestingAccount : read/update released
    Claim --> VaultPDA : transfer vested
    Claim --> Clock : read time
    Cancel --> VestingAccount : read + close
    Cancel --> VaultPDA : split + close
    Cancel --> Clock : compute vested

    VestingAccount ..> VestingError : MathOverflow / schedule
    VestingAccount --> VaultPDA : PDA authority
```

### Design notes

| Element | Decision |
|---------|----------|
| `VestingAccount` | `#[repr(C)]` + `InitSpace`; space = `8 + INIT_SPACE` |
| Tokens | `token_interface` → SPL Token and Token-2022 |
| Clock | `Clock` sysvar only; never a client timestamp |
| Closing | `close = sender` on cancel / full claim |

---

## 2. Frontend layer (Next.js / React)

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

    ThemeProvider --> CreateVestingForm : theme
    WalletProvider --> CreateVestingForm : signing
    WalletProvider --> ClaimButton
    WalletProvider --> CancelButton
    VestingProgramClient --> CreateVestingForm
    VestingProgramClient --> ClaimButton
    VestingProgramClient --> CancelButton
    VestingProgramClient --> VestingProgressBar : on-chain data
    HelpModal --> CreateVestingForm : onboarding
    TxStatusBanner --> VestingProgramClient : tx feedback
```

### Typing contracts (frontend)

- Typed props and return values; **no `any`**.
- Forms and params validated with **Zod**.
- Every component/hook has **JSDoc** (`@description`, `@param`, `@returns`).
