# Checklist — security and accessibility

Use before merge / release. Complements [`SEALEVEL_MITIGATIONS-EN.md`](SEALEVEL_MITIGATIONS-EN.md).

## On-chain security

- [ ] `VestingAccount` with `repr(C)` + `InitSpace` (139 + 8 disc.)
- [ ] Documented PDA seeds: `vesting` / `vault`
- [ ] Time only via `Clock::get()` (no client timestamps)
- [ ] Checked `u128` math (`MathOverflow`)
- [ ] `initialize`: `amount > 0`, `start ≤ cliff ≤ end`
- [ ] `claim`: `has_one = beneficiary` + Signer
- [ ] `cancel`: sender only, `cancelable`, `sender ≠ beneficiary`, distinct ATAs
- [ ] Vault closed + `close = sender` on cancel
- [ ] Sealevel suite green (`tests/sealevel_security.ts`)
- [ ] No keypairs / `.env` in the repo (only `.env.example`)

## Client / UI

- [ ] IDL synced (`bash scripts/sync-idl.sh`)
- [ ] Zod on create / lookup forms
- [ ] Progress bar based on the Clock sysvar
- [ ] Help: Cliff / Linear Unlock Rate / Revocability
- [ ] Pending / Success / Failed feedback
- [ ] Persistent theme + usable contrast in light/dark

## Accessibility

- [ ] Controls with `aria-label` / roles (`button`, `dialog`, `progressbar`, `status`)
- [ ] Help modal: `role="dialog"`, initial focus, Escape closes it
- [ ] Form errors with `role="alert"`
- [ ] RTL tests query by role, not by CSS class
- [ ] `error.tsx` / `not-found.tsx` present

## Command verification

```bash
npm test
cd app && npm test && npm run build
```

## Compute budget

Localnet: OK without extra CU. If it fails on a public cluster, instrument the client txs with:

```ts
ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
```

before `initialize` / `claim` / `cancel`.
