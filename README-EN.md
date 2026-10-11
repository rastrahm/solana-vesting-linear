# solana-vesting-linear

> 🇪🇸 Versión en español: [README-ES.md](README-ES.md) · Index: [README.md](README.md)

Linear token vesting on Solana (Anchor + SPL Token / Token-2022) with cliff, revocation and a Next.js UI.

## Stack

| Layer | Technology |
|-------|------------|
| On-chain | Rust, Anchor 0.31, `token_interface` |
| Time | `Clock` sysvar |
| Tests | Anchor TS + Sealevel suite |
| Frontend | Next.js 15 App Router, Zod, Vitest + RTL |

## Requirements

- Node ≥ 20.18 (`nvm use` — see `.nvmrc`)
- Rust / Solana CLI / Anchor 0.31+
- SBF platform-tools **v1.52** (set in `programs/.../Cargo.toml`)

## Quick commands

```bash
# Anchor workspace dependencies
npm install

# Build + on-chain tests (starts a validator)
npm test

# Sync IDL → app
bash scripts/sync-idl.sh

# UI
cd app
cp .env.example .env.local
npm install
npm run dev      # http://localhost:3000
npm test
npm run build
```

### Localnet deploy (validator already running)

```bash
solana-test-validator --reset   # another terminal
bash scripts/localnet-deploy.sh
```

## Documentation

| Doc | Content |
|-----|---------|
| [doc/PLANIFICACION-EN.md](doc/PLANIFICACION-EN.md) | Phases 0–8 |
| [doc/E2E-EN.md](doc/E2E-EN.md) | Happy path deploy → UI |
| [doc/CHECKLIST-EN.md](doc/CHECKLIST-EN.md) | Security + a11y |
| [doc/SEALEVEL_MITIGATIONS-EN.md](doc/SEALEVEL_MITIGATIONS-EN.md) | Sealevel attack vectors |
| [doc/diagrama-clases-EN.md](doc/diagrama-clases-EN.md) | Class diagram |
| [doc/diagrama-flujo-EN.md](doc/diagrama-flujo-EN.md) | On-chain decisions |
| [doc/flujograma-EN.md](doc/flujograma-EN.md) | Actors / processes |
| [app/README.md](app/README.md) | Frontend |

## On-chain instructions

- `initialize` — creates the schedule + vault PDA + deposit
- `claim` — beneficiary withdraws `vested − released`
- `cancel` — sender revokes (if `cancelable`), closes accounts

Localnet Program ID: `33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba`

## Security

Do not commit `*-keypair.json`, `.env` or wallets. The `.gitignore` already excludes them.
