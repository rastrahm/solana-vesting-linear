# Checklist — seguridad y accesibilidad

Usar antes de merge / release. Complementa `doc/SEALEVEL_MITIGATIONS.md`.

## Seguridad on-chain

- [ ] `VestingAccount` con `repr(C)` + `InitSpace` (139 + 8 disc.)
- [ ] Seeds PDA documentadas: `vesting` / `vault`
- [ ] Tiempo solo vía `Clock::get()` (sin timestamps de cliente)
- [ ] Math `u128` checked (`MathOverflow`)
- [ ] `initialize`: `amount > 0`, `start ≤ cliff ≤ end`
- [ ] `claim`: `has_one = beneficiary` + Signer
- [ ] `cancel`: solo sender, `cancelable`, `sender ≠ beneficiary`, ATAs distintas
- [ ] Cierre vault + `close = sender` en cancel
- [ ] Suite Sealevel verde (`tests/sealevel_security.ts`)
- [ ] Sin keypairs / `.env` en el repo (solo `.env.example`)

## Cliente / UI

- [ ] IDL sincronizado (`bash scripts/sync-idl.sh`)
- [ ] Zod en formularios create / lookup
- [ ] Progress bar basada en Clock sysvar
- [ ] Help: Cliff / Linear Unlock Rate / Revocability
- [ ] Feedback Pending / Success / Failed
- [ ] Theme persistente + contraste usable en light/dark

## Accesibilidad

- [ ] Controles con `aria-label` / roles (`button`, `dialog`, `progressbar`, `status`)
- [ ] Help modal: `role="dialog"`, foco inicial, Escape cierra
- [ ] Errores de formulario con `role="alert"`
- [ ] Tests RTL buscan por rol, no por clase CSS
- [ ] `error.tsx` / `not-found.tsx` presentes

## Verificación de comandos

```bash
npm test
cd app && npm test && npm run build
```

## Compute budget

Localnet: OK sin CU extra. Si falla en cluster público, instrumentar txs del client con:

```ts
ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
```

antes de `initialize` / `claim` / `cancel`.
