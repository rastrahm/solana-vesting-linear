# Flow diagram — on-chain logic

Algorithmic decisions of the program: schedule validation, linear calculation and the branches of each instruction.  
Syntax: Mermaid `flowchart`.

---

## 1. Computing `vested_amount` / `withdrawable`

```mermaid
flowchart TD
    A([Start: compute vested]) --> B[Clock::get unix_timestamp = now]
    B --> C{now < cliff_time?}
    C -->|Yes| D[vested = 0]
    C -->|No| E{now >= end_time?}
    E -->|Yes| F[vested = total_amount]
    E -->|No| G[duration = end - start]
    G --> H{checked_sub OK?}
    H -->|No| ERR1[Err MathOverflow]
    H -->|Yes| I[elapsed = now - start]
    I --> J{checked_sub OK?}
    J -->|No| ERR1
    J -->|Yes| K["vested = total * elapsed / duration<br/>(u128 checked)"]
    K --> L{overflow / div0?}
    L -->|Yes| ERR1
    L -->|No| M[vested: u64]
    D --> N[withdrawable = vested - released]
    F --> N
    M --> N
    N --> O{checked_sub OK?}
    O -->|No| ERR1
    O -->|Yes| P([Return withdrawable])
```

---

## 2. Instruction `initialize`

```mermaid
flowchart TD
    A([initialize]) --> B{amount > 0?}
    B -->|No| E1[Err InvalidAmount]
    B -->|Yes| C{start_time <= cliff_time?}
    C -->|No| E2[Err InvalidVestingSchedule]
    C -->|Yes| D{cliff_time <= end_time?}
    D -->|No| E2
    D -->|Yes| F[Init VestingAccount PDA<br/>space = 8 + INIT_SPACE]
    F --> G[Init Vault PDA TokenAccount]
    G --> H[CPI transfer: sender ATA → vault]
    H --> I{transfer OK?}
    I -->|No| E3[Err Token / CPI]
    I -->|Yes| J[Persist fields + bumps]
    J --> K([Ok])
```

---

## 3. Instruction `claim`

```mermaid
flowchart TD
    A([claim]) --> B{signer == beneficiary<br/>has_one?}
    B -->|No| E1[Err Unauthorized]
    B -->|Yes| C[Compute withdrawable with Clock]
    C --> D{withdrawable > 0?}
    D -->|No| E2[Err NothingToClaim]
    D -->|Yes| E[CPI transfer vault → beneficiary ATA]
    E --> F[released_amount += withdrawable]
    F --> G{released == total?}
    G -->|Yes| H[Optional: close vault / vesting]
    G -->|No| I([Ok])
    H --> I
```

---

## 4. Instruction `cancel`

```mermaid
flowchart TD
    A([cancel]) --> B{signer == sender?}
    B -->|No| E1[Err Unauthorized]
    B -->|Yes| C{cancelable == true?}
    C -->|No| E2[Err NotCancelable]
    C -->|Yes| D[Compute vested with Clock]
    D --> E[to_beneficiary = vested - released]
    E --> F[to_sender = total - vested]
    F --> G{to_beneficiary > 0?}
    G -->|Yes| H[CPI vault → beneficiary]
    G -->|No| I
    H --> I{to_sender > 0?}
    I -->|Yes| J[CPI vault → sender]
    I -->|No| K
    J --> K[Close vault + close vesting<br/>lamports → sender]
    K --> L([Ok])
```

---

## Temporal invariants

```text
start_time  ≤  cliff_time  ≤  end_time
released_amount  ≤  vested(now)  ≤  total_amount
```

Any schedule violation in `initialize` → `InvalidVestingSchedule`.  
Arithmetic overflow → `MathOverflow` (no panic / no unwrap).
