# solana-vesting-linear

> 🇬🇧 English version: [README-EN.md](README-EN.md) · Índice: [README.md](README.md)

Vesting lineal de tokens en Solana (Anchor + SPL Token / Token-2022) con cliff, revocación y UI Next.js.

## Stack

| Capa | Tecnología |
|------|------------|
| On-chain | Rust, Anchor 0.31, `token_interface` |
| Tiempo | `Clock` sysvar |
| Tests | Anchor TS + suite Sealevel |
| Frontend | Next.js 15 App Router, Zod, Vitest + RTL |

## Requisitos

- Node ≥ 20.18 (`nvm use` — ver `.nvmrc`)
- Rust / Solana CLI / Anchor 0.31+
- Platform-tools SBF **v1.52** (definido en `programs/.../Cargo.toml`)

## Comandos rápidos

```bash
# Dependencias del workspace Anchor
npm install

# Build + tests on-chain (levanta validator)
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

### Deploy localnet (validator ya corriendo)

```bash
solana-test-validator --reset   # otra terminal
bash scripts/localnet-deploy.sh
```

## Documentación

| Doc | Contenido |
|-----|-----------|
| [doc/PLANIFICACION-ES.md](doc/PLANIFICACION-ES.md) | Fases 0–8 |
| [doc/E2E-ES.md](doc/E2E-ES.md) | Flujo feliz deploy → UI |
| [doc/CHECKLIST-ES.md](doc/CHECKLIST-ES.md) | Seguridad + a11y |
| [doc/SEALEVEL_MITIGATIONS-ES.md](doc/SEALEVEL_MITIGATIONS-ES.md) | Vectores Sealevel |
| [doc/diagrama-clases-ES.md](doc/diagrama-clases-ES.md) | Clases |
| [doc/diagrama-flujo-ES.md](doc/diagrama-flujo-ES.md) | Decisiones on-chain |
| [doc/flujograma-ES.md](doc/flujograma-ES.md) | Actores / procesos |
| [app/README.md](app/README.md) | Frontend |

## Instrucciones on-chain

- `initialize` — crea schedule + vault PDA + depósito
- `claim` — beneficiary retira `vested − released`
- `cancel` — sender revoca (si `cancelable`), cierra cuentas

Program ID localnet: `33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba`

## Seguridad

No commitear `*-keypair.json`, `.env` ni wallets. El `.gitignore` ya los excluye.
