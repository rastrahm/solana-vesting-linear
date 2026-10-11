# Process flowchart — actors and business processes

Interaction sequence between **Sender**, **Beneficiary**, **Frontend**, **Program** and **Token Program**.  
Complements the flow diagram (internal decisions) with the end-to-end process view.

---

## 1. General lifecycle flowchart

```mermaid
flowchart LR
    subgraph Actors
        S[Sender / Creator]
        B[Beneficiary]
    end

    subgraph Client
        UI[Next.js Frontend]
        W[Wallet Adapter]
    end

    subgraph Chain
        P[Vesting Program]
        V[(VestingAccount PDA)]
        VA[(Vault Token PDA)]
        TP[Token Program<br/>SPL / Token-2022]
        CLK[Clock Sysvar]
    end

    S --> W
    B --> W
    W --> UI
    UI -->|initialize / claim / cancel| P
    P --> V
    P --> VA
    P --> TP
    P --> CLK
```

---

## 2. Process: create vesting (Sender)

```mermaid
sequenceDiagram
    actor Sender
    participant UI as Frontend
    participant W as Wallet
    participant P as Program
    participant TP as Token Program
    participant V as VestingAccount
    participant Vault as Vault PDA

    Sender->>UI: Fills in the form<br/>(beneficiary, mint, schedule, amount, cancelable)
    UI->>UI: Zod validation
    UI->>W: Request initialize signature
    W->>P: TX initialize
    P->>P: Validate start ≤ cliff ≤ end
    P->>V: Init state PDA
    P->>Vault: Init token account PDA
    P->>TP: Transfer amount → Vault
    TP-->>Vault: Balance = total_amount
    P-->>UI: Success
    UI-->>Sender: TxStatus Success + explorer link
```

---

## 3. Process: claim tokens (Beneficiary)

```mermaid
sequenceDiagram
    actor Beneficiary
    participant UI as Frontend
    participant W as Wallet
    participant P as Program
    participant CLK as Clock
    participant Vault as Vault PDA
    participant ATA as Beneficiary ATA

    Beneficiary->>UI: Opens vesting / clicks Claim
    UI->>P: Fetch state + cluster time
    UI->>UI: ProgressBar (vested vs released)
    Beneficiary->>W: Signs claim
    W->>P: TX claim
    P->>CLK: unix_timestamp
    P->>P: withdrawable = vested - released
    alt withdrawable == 0
        P-->>UI: Err NothingToClaim
        UI-->>Beneficiary: Failed / no tokens
    else withdrawable > 0
        P->>Vault: Debit withdrawable
        P->>ATA: Credit withdrawable
        P->>P: released_amount += withdrawable
        P-->>UI: Success
        UI-->>Beneficiary: Success + updated bar
    end
```

---

## 4. Process: revoke vesting (Sender)

```mermaid
sequenceDiagram
    actor Sender
    actor Beneficiary
    participant UI as Frontend
    participant P as Program
    participant CLK as Clock
    participant Vault as Vault PDA

    Sender->>UI: Requests Cancel
    UI->>UI: Confirm (Help: Revocability)
    Sender->>P: TX cancel (sender signature)
    P->>P: signer == sender and cancelable?
    alt not authorized or not cancelable
        P-->>UI: Err Unauthorized / NotCancelable
    else OK
        P->>CLK: now
        P->>P: vested / unvested
        P->>Vault: Transfer vested → Beneficiary ATA
        P->>Vault: Transfer unvested → Sender ATA
        P->>P: Close Vault + Close VestingAccount
        P-->>UI: Success
        UI-->>Sender: Unvested funds recovered
        UI-->>Beneficiary: Vested share received
    end
```

---

## 5. UX flowchart: theme and help

```mermaid
flowchart TD
    A([User opens the app]) --> B{Theme in localStorage?}
    B -->|Yes| C[Apply saved theme]
    B -->|No| D{prefers-color-scheme}
    D -->|dark| E[Dark theme]
    D -->|light| F[Light theme]
    C --> G[Render UI]
    E --> G
    F --> G
    G --> H{Opens Help?}
    H -->|Yes| I[Modal: Cliff / Linear / Revocability]
    H -->|No| J[Continue create/claim/cancel flow]
    I --> J
    G --> K[Toggle theme]
    K --> L[Save to localStorage]
    L --> G
```

---

## 6. Transaction states (UI feedback)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Pending: User signs
    Pending --> Success: On-chain confirmation
    Pending --> Failed: Program error / rejection
    Success --> Idle: New action
    Failed --> Idle: Retry / close
```

---

## Role legend

| Role | Can |
|------|-----|
| **Sender** | `initialize`, `cancel` (if `cancelable`) |
| **Beneficiary** | `claim` already vested tokens |
| **Frontend** | Validate inputs, show progress and Help; does **not** decide vesting time |
| **Program** | Single source of truth for time (`Clock`) and balances |
