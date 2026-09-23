# Planificación — solana-vesting-linear

Programa de vesting lineal de tokens en Solana (Anchor + SPL Token / Token-2022) con cliff, revocación y frontend Next.js.

**Regla de trabajo:** cada fase se ejecuta solo tras tu autorización explícita.  
**Metodología:** TDD (tests primero) según `rust.cursorrules`, `solana.cursorrules` y `nextjs.cursorrules`.

---

## Resumen de fases

| Fase | Nombre | Entregable principal | Estado |
|------|--------|----------------------|--------|
| 0 | Bootstrap del monorepo | Workspace Anchor + estructura | ✅ Completada |
| 1 | Estado on-chain y errores | `VestingAccount`, errores, layout `repr(C)` | ✅ Completada |
| 2 | Instruction `initialize` | Crear vesting + vault PDA + depósito | ✅ Completada |
| 3 | Instruction `claim` | Liberación lineal con `Clock` | ✅ Completada |
| 4 | Instruction `cancel` | Revocación y cierre de cuentas | ✅ Completada |
| 5 | Suite de seguridad Sealevel | Ataques type cosplay, CPI, overflow | ✅ Completada |
| 6 | Frontend base Next.js | App Router, tema, wallet | ✅ Completada |
| 7 | UI de vesting + Help | Formularios, progreso, modal ayuda | ✅ Completada |
| 8 | Integración E2E y hardenin | Deploy local, checklist final | ⏳ Pendiente de autorización |

---

## Fase 0 — Bootstrap del monorepo

**Objetivo:** Esqueleto del proyecto listo para compilar y testear.

**Alcance:**
- Inicializar proyecto Anchor 0.30+ (`programs/solana_vesting_linear`).
- `Cargo.toml` workspace; `Anchor.toml` (localnet).
- Carpeta `tests/` (TypeScript) y stub de `programs/.../src/lib.rs` con `declare_id!`.
- Estructura futura `app/` (Next.js) documentada, sin implementar UI aún.
- Scripts: `anchor build`, `anchor test` (smoke).

**Criterios de aceptación:**
- [x] `anchor build` compila.
- [x] Test vacío/smoke pasa con `anchor test`.
- [x] `.gitignore` respeta keys, `.anchor`, `target`, `node_modules`.

**Notas de entorno (Fase 0):**
- Node **≥ 20.18** (`.nvmrc` → 20). Package manager: **npm**.
- Platform-tools SBF: **v1.52** (`[package.metadata.solana] tools-version` en el `Cargo.toml` del programa) — evita crates `edition2024` incompatibles con tools v1.48.
- Program ID localnet: `33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba` (keypair en `target/deploy/`, gitignored).

**No incluye:** lógica de vesting ni frontend.

---

## Fase 1 — Estado on-chain y errores

**Objetivo:** Definir layout de bytes y catálogo de errores (TDD: tests de tamaño/serialización primero si aplica).

**Alcance:**
- Struct `VestingAccount` con `#[account]`, `#[repr(C)]`, `#[derive(InitSpace)]`.
- Campos exactos (147 bytes = 8 discriminator + 139):

```text
sender, beneficiary, mint          → Pubkey × 3
start_time, cliff_time, end_time → i64 × 3
total_amount, released_amount    → u64 × 2
cancelable, bump, vault_bump     → bool + u8 + u8
```

- `#[error_code]` `VestingError`: `InvalidVestingSchedule`, `MathOverflow`, `NothingToClaim`, `NotCancelable`, `Unauthorized`, etc.
- Seeds PDA documentadas:
  - Vesting: `["vesting", sender, beneficiary, mint]` (o variante acordada y documentada).
  - Vault: `["vault", vesting_account.key()]`.

**Criterios de aceptación:**
- [x] `VestingAccount::INIT_SPACE == 139`.
- [x] Campos ordenados por alineación (32 → 8 → 1).
- [x] Errores documentados con `///`.

**Seeds acordadas:**
- Vesting: `["vesting", sender, beneficiary, mint]`
- Vault: `["vault", vesting_account.key()]`

**No incluye:** instrucciones `initialize` / `claim` / `cancel` completas.

---

## Fase 2 — Instruction `initialize`

**Objetivo:** Crear schedule, vault ATA/PDA y transferir `total_amount` desde el sender.

**Alcance (TDD primero):**
- Tests: schedule válido, `start <= cliff <= end`, monto > 0, PDA seeds.
- `Initialize` con `token_interface` (Token + Token-2022).
- Constraints explícitas: `init`, `payer`, `space = 8 + VestingAccount::INIT_SPACE`, `seeds`, `bump`.
- Transfer CPI sender → vault.
- Validación temporal → `InvalidVestingSchedule`.

**Criterios de aceptación:**
- [x] Estado persistido correcto tras `initialize`.
- [x] Vault con balance = `total_amount`.
- [x] Schedule inválido falla con error custom.

---

## Fase 3 — Instruction `claim`

**Objetivo:** Beneficiario retira solo lo vested − released, usando `Clock::get()?.unix_timestamp`.

**Alcance (TDD primero):**
- Tests: before-cliff → 0; mid (50%) → 50%; post-end → resto total.
- Fórmula lineal con `u128` checked math (ver `.cursorrules` §4.A).
- `has_one = beneficiary` + signer.
- Actualizar `released_amount`; opcional cierre si todo liberado.

**Criterios de aceptación:**
- [x] Antes del cliff: claim falla o retira 0 (`NothingToClaim`).
- [x] A mitad de duración: claimable ≈ 50% (precisión documentada).
- [x] Tras `end_time`: claimable = `total_amount - released_amount`.
- [x] No se confía en timestamps del cliente.

**Notas:** Mid-vesting en TS usa schedule relativo al Clock del cluster (±2s de tolerancia); exactitud 50% cubierta en unit test Rust (`math::mid_duration_is_exact_half`). Cierre de cuentas al 100% liberado se deja para Fase 4 / hardening.

---

## Fase 4 — Instruction `cancel`

**Objetivo:** Solo `sender` si `cancelable == true`: vested → beneficiary, unvested → sender; cerrar vault y vesting.

**Alcance (TDD primero):**
- Tests: cancel OK; cancel cuando `cancelable == false`; no-sender; payouts proporcionales.
- `close = sender` para reclaim de lamports.
- Mitigar duplicate account (beneficiary/sender distintos cuando aplique).

**Criterios de aceptación:**
- [x] Tokens vested al beneficiary; unvested al sender.
- [x] Cuentas cerradas; no re-init posible con datos viejos.
- [x] No cancelable / no autorizado → error.

**Mitigaciones duplicate-account:** `sender != beneficiary` y `sender_token_account != beneficiary_token_account`.

---

## Fase 5 — Suite de seguridad Sealevel

**Objetivo:** Cobertura de vectores del Solana Program Security Guide.

**Casos obligatorios:**
1. Type cosplay / account injection (discriminator spoof).
2. Unchecked signers / account substitution en CPI.
3. Duplicate accounts en cancel.
4. Overflow / precision (`u64::MAX`, duration 0).
5. Reinits tras close.

**Criterios de aceptación:**
- [x] Todos los vectores fallan de forma segura (assert de error).
- [x] Documentación breve de cada mitigación en `doc/` o comentarios `///`.

**Artefactos:** `tests/sealevel_security.ts`, `doc/SEALEVEL_MITIGATIONS.md`, tests Rust overflow en `math.rs`.
---

## Fase 6 — Frontend base Next.js

**Objetivo:** App Router con tipado estricto, tema y wallet (sin pantallas de vesting completas).

**Alcance (TDD UI primero con Vitest + RTL):**
- Next.js App Router; `'use client'` / `'use server'` explícitos.
- Zod para inputs futuros.
- Theme light/dark: `localStorage` + `prefers-color-scheme`.
- Conexión de wallet (adapter Solana) + indicadores Pending / Success / Failed.
- `error.tsx` / `not-found.tsx` en rutas principales.
- JSDoc en componentes/hooks.

**Criterios de aceptación:**
- [x] Switch de tema persistente.
- [x] Wallet conecta en localnet/devnet config.
- [x] Cero `any`; tests de interacción por rol/aria.

**Artefactos:** `app/` (Next.js 15 App Router). Comandos: `cd app && npm install && npm run dev` / `npm test`.

---

## Fase 7 — UI de vesting + Help

**Objetivo:** Flujos Create / Claim / Cancel + Help modal.

**Alcance:**
- Formularios create (schedule, amount, cancelable) validados con Zod.
- Barras de progreso según cluster time (no reloj del browser solo).
- Help: Cliff, Linear Unlock Rate, Revocability.
- Feedback en tiempo real del estado on-chain.

**Criterios de aceptación:**
- [x] Usuario puede crear, claim y cancel (si aplica) desde la UI.
- [x] Help explica los 3 conceptos requeridos.
- [x] Progress bar coherente con fórmula on-chain.

**Notas:** Progreso usa Clock sysvar (`getClusterUnixTimestamp`); fórmula en `app/src/lib/vestingMath.ts` espejo de `math.rs`.

---

## Fase 8 — Integración E2E y hardening

**Objetivo:** Cierre del ciclo deploy → UI → verificación.

**Alcance:**
- Script deploy localnet + IDL tipado en frontend.
- Checklist de seguridad y accesibilidad.
- README de uso (comandos build/test/dev).
- Ajuste compute budget si hace falta.

**Criterios de aceptación:**
- [ ] Flujo feliz E2E documentado.
- [ ] `anchor test` + tests frontend verdes.
- [ ] Sin keys ni `.env` en el repo.

---

## Dependencias entre fases

```text
F0 → F1 → F2 → F3 → F4 → F5
                      ↘
F6 → F7 ─────────────→ F8
```

F6 puede empezar en paralelo tras F2 (IDL mínimo), pero F7 requiere F3–F4 estables. F8 al final.

---

## Stack de referencia

| Capa | Tecnología |
|------|------------|
| On-chain | Rust 1.75+, Anchor 0.30+, `anchor_spl::token_interface` |
| Tiempo | `Clock::get()?.unix_timestamp` |
| Frontend | Next.js App Router, TypeScript, Zod, Vitest + RTL |
| UX | Theme + Help module |
| Seguridad | Sealevel mitigations + cuenta `close` |

---

## Próximo paso

**Fase 7 completada.** Autoriza la **Fase 8** (E2E, checklist y hardening) para continuar.
