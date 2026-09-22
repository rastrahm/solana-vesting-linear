# Flujograma — actores y procesos de negocio

Secuencia de interacción entre **Sender**, **Beneficiary**, **Frontend**, **Programa** y **Token Program**.  
Complementa el diagrama de flujo (decisiones internas) con la visión de proceso extremo a extremo.

---

## 1. Flujograma general del ciclo de vida

```mermaid
flowchart LR
    subgraph Actores
        S[Sender / Creador]
        B[Beneficiary]
    end

    subgraph Cliente
        UI[Frontend Next.js]
        W[Wallet Adapter]
    end

    subgraph Cadena
        P[Programa Vesting]
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

## 2. Proceso: crear vesting (Sender)

```mermaid
sequenceDiagram
    actor Sender
    participant UI as Frontend
    participant W as Wallet
    participant P as Programa
    participant TP as Token Program
    participant V as VestingAccount
    participant Vault as Vault PDA

    Sender->>UI: Completa formulario<br/>(beneficiary, mint, schedule, amount, cancelable)
    UI->>UI: Validar Zod
    UI->>W: Solicitar firma initialize
    W->>P: TX initialize
    P->>P: Validar start ≤ cliff ≤ end
    P->>V: Init PDA estado
    P->>Vault: Init token account PDA
    P->>TP: Transfer amount → Vault
    TP-->>Vault: Balance = total_amount
    P-->>UI: Success
    UI-->>Sender: TxStatus Success + link explorer
```

---

## 3. Proceso: reclamar tokens (Beneficiary)

```mermaid
sequenceDiagram
    actor Beneficiary
    participant UI as Frontend
    participant W as Wallet
    participant P as Programa
    participant CLK as Clock
    participant Vault as Vault PDA
    participant ATA as Beneficiary ATA

    Beneficiary->>UI: Abre vesting / pulsa Claim
    UI->>P: Fetch estado + cluster time
    UI->>UI: ProgressBar (vested vs released)
    Beneficiary->>W: Firma claim
    W->>P: TX claim
    P->>CLK: unix_timestamp
    P->>P: withdrawable = vested - released
    alt withdrawable == 0
        P-->>UI: Err NothingToClaim
        UI-->>Beneficiary: Failed / sin tokens
    else withdrawable > 0
        P->>Vault: Debitar withdrawable
        P->>ATA: Acreditar withdrawable
        P->>P: released_amount += withdrawable
        P-->>UI: Success
        UI-->>Beneficiary: Success + barra actualizada
    end
```

---

## 4. Proceso: revocar vesting (Sender)

```mermaid
sequenceDiagram
    actor Sender
    actor Beneficiary
    participant UI as Frontend
    participant P as Programa
    participant CLK as Clock
    participant Vault as Vault PDA

    Sender->>UI: Solicita Cancel
    UI->>UI: Confirmar (Help: Revocability)
    Sender->>P: TX cancel (firma sender)
    P->>P: ¿signer == sender y cancelable?
    alt no autorizado o no cancelable
        P-->>UI: Err Unauthorized / NotCancelable
    else OK
        P->>CLK: now
        P->>P: vested / unvested
        P->>Vault: Transfer vested → Beneficiary ATA
        P->>Vault: Transfer unvested → Sender ATA
        P->>P: Close Vault + Close VestingAccount
        P-->>UI: Success
        UI-->>Sender: Fondos no vestidos recuperados
        UI-->>Beneficiary: Parte vestida recibida
    end
```

---

## 5. Flujograma UX: tema y ayuda

```mermaid
flowchart TD
    A([Usuario abre la app]) --> B{¿localStorage theme?}
    B -->|Sí| C[Aplicar tema guardado]
    B -->|No| D{prefers-color-scheme}
    D -->|dark| E[Tema dark]
    D -->|light| F[Tema light]
    C --> G[Render UI]
    E --> G
    F --> G
    G --> H{¿Abre Help?}
    H -->|Sí| I[Modal: Cliff / Linear / Revocability]
    H -->|No| J[Continúa flujo create/claim/cancel]
    I --> J
    G --> K[Toggle tema]
    K --> L[Guardar en localStorage]
    L --> G
```

---

## 6. Estados de transacción (feedback UI)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Pending: Usuario firma
    Pending --> Success: Confirmación on-chain
    Pending --> Failed: Error programa / rechazo
    Success --> Idle: Nueva acción
    Failed --> Idle: Reintentar / cerrar
```

---

## Leyenda de roles

| Rol | Puede |
|-----|--------|
| **Sender** | `initialize`, `cancel` (si `cancelable`) |
| **Beneficiary** | `claim` de tokens ya vestidos |
| **Frontend** | Validar inputs, mostrar progreso y Help; **no** decide el tiempo de vesting |
| **Programa** | Única fuente de verdad temporal (`Clock`) y de balances |
