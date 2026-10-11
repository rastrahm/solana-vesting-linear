# Diagrama de flujo — lógica on-chain

Decisiones algorítmicas del programa: validación de schedule, cálculo lineal y ramas de cada instrucción.  
Sintaxis: Mermaid `flowchart`.

---

## 1. Cálculo de `vested_amount` / `withdrawable`

```mermaid
flowchart TD
    A([Inicio: calcular vested]) --> B[Clock::get unix_timestamp = now]
    B --> C{now < cliff_time?}
    C -->|Sí| D[vested = 0]
    C -->|No| E{now >= end_time?}
    E -->|Sí| F[vested = total_amount]
    E -->|No| G[duration = end - start]
    G --> H{checked_sub OK?}
    H -->|No| ERR1[Err MathOverflow]
    H -->|Sí| I[elapsed = now - start]
    I --> J{checked_sub OK?}
    J -->|No| ERR1
    J -->|Sí| K["vested = total * elapsed / duration<br/>(u128 checked)"]
    K --> L{overflow / div0?}
    L -->|Sí| ERR1
    L -->|No| M[vested: u64]
    D --> N[withdrawable = vested - released]
    F --> N
    M --> N
    N --> O{checked_sub OK?}
    O -->|No| ERR1
    O -->|Sí| P([Retornar withdrawable])
```

---

## 2. Instruction `initialize`

```mermaid
flowchart TD
    A([initialize]) --> B{amount > 0?}
    B -->|No| E1[Err InvalidAmount]
    B -->|Sí| C{start_time <= cliff_time?}
    C -->|No| E2[Err InvalidVestingSchedule]
    C -->|Sí| D{cliff_time <= end_time?}
    D -->|No| E2
    D -->|Sí| F[Init VestingAccount PDA<br/>space = 8 + INIT_SPACE]
    F --> G[Init Vault PDA TokenAccount]
    G --> H[CPI transfer: sender ATA → vault]
    H --> I{transfer OK?}
    I -->|No| E3[Err Token / CPI]
    I -->|Sí| J[Persistir campos + bumps]
    J --> K([Ok])
```

---

## 3. Instruction `claim`

```mermaid
flowchart TD
    A([claim]) --> B{signer == beneficiary<br/>has_one?}
    B -->|No| E1[Err Unauthorized]
    B -->|Sí| C[Calcular withdrawable con Clock]
    C --> D{withdrawable > 0?}
    D -->|No| E2[Err NothingToClaim]
    D -->|Sí| E[CPI transfer vault → beneficiary ATA]
    E --> F[released_amount += withdrawable]
    F --> G{released == total?}
    G -->|Sí| H[Opcional: close vault / vesting]
    G -->|No| I([Ok])
    H --> I
```

---

## 4. Instruction `cancel`

```mermaid
flowchart TD
    A([cancel]) --> B{signer == sender?}
    B -->|No| E1[Err Unauthorized]
    B -->|Sí| C{cancelable == true?}
    C -->|No| E2[Err NotCancelable]
    C -->|Sí| D[Calcular vested con Clock]
    D --> E[to_beneficiary = vested - released]
    E --> F[to_sender = total - vested]
    F --> G{to_beneficiary > 0?}
    G -->|Sí| H[CPI vault → beneficiary]
    G -->|No| I
    H --> I{to_sender > 0?}
    I -->|Sí| J[CPI vault → sender]
    I -->|No| K
    J --> K[Close vault + close vesting<br/>lamports → sender]
    K --> L([Ok])
```

---

## Invariantes temporales

```text
start_time  ≤  cliff_time  ≤  end_time
released_amount  ≤  vested(now)  ≤  total_amount
```

Cualquier violación de schedule en `initialize` → `InvalidVestingSchedule`.  
Overflow en aritmética → `MathOverflow` (sin panic / sin unwrap).
