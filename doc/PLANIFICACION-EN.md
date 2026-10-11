# Planning — solana-vesting-linear

Linear token vesting program on Solana (Anchor + SPL Token / Token-2022) with cliff, revocation and a Next.js frontend.

**Working rule:** each phase is executed only after your explicit authorization.  
**Methodology:** TDD (tests first) following `rust.cursorrules`, `solana.cursorrules` and `nextjs.cursorrules`.

---

## Phase summary

| Phase | Name | Main deliverable | Status |
|-------|------|------------------|--------|
| 0 | Monorepo bootstrap | Anchor workspace + structure | ✅ Done |
| 1 | On-chain state and errors | `VestingAccount`, errors, `repr(C)` layout | ✅ Done |
| 2 | Instruction `initialize` | Create vesting + vault PDA + deposit | ✅ Done |
| 3 | Instruction `claim` | Linear release with `Clock` | ✅ Done |
| 4 | Instruction `cancel` | Revocation and account closing | ✅ Done |
| 5 | Sealevel security suite | Type cosplay, CPI, overflow attacks | ✅ Done |
| 6 | Next.js frontend base | App Router, theme, wallet | ✅ Done |
| 7 | Vesting UI + Help | Forms, progress, help modal | ✅ Done |
| 8 | E2E integration and hardening | Local deploy, final checklist | ✅ Done |

---

## Phase 0 — Monorepo bootstrap

**Goal:** Project skeleton ready to build and test.

**Scope:**
- Initialize the Anchor 0.30+ project (`programs/solana_vesting_linear`).
- Workspace `Cargo.toml`; `Anchor.toml` (localnet).
- `tests/` folder (TypeScript) and a stub `programs/.../src/lib.rs` with `declare_id!`.
- Future `app/` (Next.js) structure documented, no UI implemented yet.
- Scripts: `anchor build`, `anchor test` (smoke).

**Acceptance criteria:**
- [x] `anchor build` compiles.
- [x] Empty/smoke test passes with `anchor test`.
- [x] `.gitignore` covers keys, `.anchor`, `target`, `node_modules`.

**Environment notes (Phase 0):**
- Node **≥ 20.18** (`.nvmrc` → 20). Package manager: **npm**.
- SBF platform-tools: **v1.52** (`[package.metadata.solana] tools-version` in the program's `Cargo.toml`) — avoids `edition2024` crates incompatible with tools v1.48.
- Localnet Program ID: `33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba` (keypair in `target/deploy/`, gitignored).

**Not included:** vesting logic or frontend.

---

## Phase 1 — On-chain state and errors

**Goal:** Define the byte layout and the error catalog (TDD: size/serialization tests first where applicable).

**Scope:**
- `VestingAccount` struct with `#[account]`, `#[repr(C)]`, `#[derive(InitSpace)]`.
- Exact fields (147 bytes = 8 discriminator + 139):

```text
sender, beneficiary, mint          → Pubkey × 3
start_time, cliff_time, end_time → i64 × 3
total_amount, released_amount    → u64 × 2
cancelable, bump, vault_bump     → bool + u8 + u8
```

- `#[error_code]` `VestingError`: `InvalidVestingSchedule`, `MathOverflow`, `NothingToClaim`, `NotCancelable`, `Unauthorized`, etc.
- Documented PDA seeds:
  - Vesting: `["vesting", sender, beneficiary, mint]` (or an agreed, documented variant).
  - Vault: `["vault", vesting_account.key()]`.

**Acceptance criteria:**
- [x] `VestingAccount::INIT_SPACE == 139`.
- [x] Fields ordered by alignment (32 → 8 → 1).
- [x] Errors documented with `///`.

**Agreed seeds:**
- Vesting: `["vesting", sender, beneficiary, mint]`
- Vault: `["vault", vesting_account.key()]`

**Not included:** full `initialize` / `claim` / `cancel` instructions.

---

## Phase 2 — Instruction `initialize`

**Goal:** Create the schedule, the vault ATA/PDA and transfer `total_amount` from the sender.

**Scope (TDD first):**
- Tests: valid schedule, `start <= cliff <= end`, amount > 0, PDA seeds.
- `Initialize` with `token_interface` (Token + Token-2022).
- Explicit constraints: `init`, `payer`, `space = 8 + VestingAccount::INIT_SPACE`, `seeds`, `bump`.
- Transfer CPI sender → vault.
- Time validation → `InvalidVestingSchedule`.

**Acceptance criteria:**
- [x] State persisted correctly after `initialize`.
- [x] Vault balance = `total_amount`.
- [x] Invalid schedule fails with a custom error.

---

## Phase 3 — Instruction `claim`

**Goal:** The beneficiary withdraws only vested − released, using `Clock::get()?.unix_timestamp`.

**Scope (TDD first):**
- Tests: before cliff → 0; mid (50%) → 50%; after end → full remainder.
- Linear formula with checked `u128` math (see `.cursorrules` §4.A).
- `has_one = beneficiary` + signer.
- Update `released_amount`; optional close when everything is released.

**Acceptance criteria:**
- [x] Before the cliff: claim fails or withdraws 0 (`NothingToClaim`).
- [x] At half duration: claimable ≈ 50% (documented precision).
- [x] After `end_time`: claimable = `total_amount - released_amount`.
- [x] Client timestamps are not trusted.

**Notes:** The TS mid-vesting test uses a schedule relative to the cluster Clock (±2s tolerance); the exact 50% is covered by the Rust unit test (`math::mid_duration_is_exact_half`). Closing accounts at 100% released is left for Phase 4 / hardening.

---

## Phase 4 — Instruction `cancel`

**Goal:** Only the `sender`, if `cancelable == true`: vested → beneficiary, unvested → sender; close vault and vesting.

**Scope (TDD first):**
- Tests: cancel OK; cancel when `cancelable == false`; non-sender; proportional payouts.
- `close = sender` to reclaim lamports.
- Mitigate duplicate accounts (distinct beneficiary/sender where applicable).

**Acceptance criteria:**
- [x] Vested tokens to the beneficiary; unvested to the sender.
- [x] Accounts closed; no re-init possible with stale data.
- [x] Not cancelable / not authorized → error.

**Duplicate-account mitigations:** `sender != beneficiary` and `sender_token_account != beneficiary_token_account`.

---

## Phase 5 — Sealevel security suite

**Goal:** Coverage of the Solana Program Security Guide vectors.

**Mandatory cases:**
1. Type cosplay / account injection (discriminator spoof).
2. Unchecked signers / account substitution in CPI.
3. Duplicate accounts in cancel.
4. Overflow / precision (`u64::MAX`, duration 0).
5. Reinits after close.

**Acceptance criteria:**
- [x] All vectors fail safely (error asserted).
- [x] Short documentation of each mitigation in `doc/` or `///` comments.

**Artifacts:** `tests/sealevel_security.ts`, `doc/SEALEVEL_MITIGATIONS-EN.md`, Rust overflow tests in `math.rs`.

---

## Phase 6 — Next.js frontend base

**Goal:** App Router with strict typing, theme and wallet (no full vesting screens yet).

**Scope (UI TDD first with Vitest + RTL):**
- Next.js App Router; explicit `'use client'` / `'use server'`.
- Zod for upcoming inputs.
- Light/dark theme: `localStorage` + `prefers-color-scheme`.
- Wallet connection (Solana adapter) + Pending / Success / Failed indicators.
- `error.tsx` / `not-found.tsx` on the main routes.
- JSDoc on components/hooks.

**Acceptance criteria:**
- [x] Persistent theme switch.
- [x] Wallet connects with localnet/devnet config.
- [x] Zero `any`; interaction tests by role/aria.

**Artifacts:** `app/` (Next.js 15 App Router). Commands: `cd app && npm install && npm run dev` / `npm test`.

---

## Phase 7 — Vesting UI + Help

**Goal:** Create / Claim / Cancel flows + Help modal.

**Scope:**
- Create forms (schedule, amount, cancelable) validated with Zod.
- Progress bars based on cluster time (not just the browser clock).
- Help: Cliff, Linear Unlock Rate, Revocability.
- Real-time feedback of the on-chain state.

**Acceptance criteria:**
- [x] The user can create, claim and cancel (when applicable) from the UI.
- [x] Help explains the 3 required concepts.
- [x] Progress bar consistent with the on-chain formula.

**Notes:** Progress uses the Clock sysvar (`getClusterUnixTimestamp`); the formula in `app/src/lib/vestingMath.ts` mirrors `math.rs`.

---

## Phase 8 — E2E integration and hardening

**Goal:** Close the deploy → UI → verification cycle.

**Scope:**
- Localnet deploy script + typed IDL in the frontend.
- Security and accessibility checklist.
- Usage README (build/test/dev commands).
- Compute budget tuning if needed.

**Acceptance criteria:**
- [x] E2E happy path documented.
- [x] `anchor test` + frontend tests green.
- [x] No keys or `.env` in the repo.

**Phase 8 artifacts:**
- `README.md` (root index), `README-EN.md` / `README-ES.md`
- `doc/E2E-EN.md`, `doc/CHECKLIST-EN.md`
- `scripts/sync-idl.sh`, `scripts/localnet-deploy.sh`
- npm scripts: `sync:idl`, `deploy:localnet`, `test:all`, `dev:app`

---

## Phase dependencies

```text
F0 → F1 → F2 → F3 → F4 → F5
                      ↘
F6 → F7 ─────────────→ F8
```

F6 can start in parallel after F2 (minimal IDL), but F7 requires F3–F4 to be stable. F8 goes last.

---

## Reference stack

| Layer | Technology |
|-------|------------|
| On-chain | Rust 1.75+, Anchor 0.30+, `anchor_spl::token_interface` |
| Time | `Clock::get()?.unix_timestamp` |
| Frontend | Next.js App Router, TypeScript, Zod, Vitest + RTL |
| UX | Theme + Help module |
| Security | Sealevel mitigations + account `close` |

---

## Next step

**Full plan (Phases 0–8) complete.** Use [`E2E-EN.md`](E2E-EN.md) + [`CHECKLIST-EN.md`](CHECKLIST-EN.md) to validate releases.
