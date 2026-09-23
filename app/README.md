# Frontend Next.js — Fase 6

App Router con tema light/dark, wallet adapter Solana y feedback de transacciones.

## Requisitos

- Node ≥ 20.18 (`nvm use` en la raíz del monorepo)

## Comandos

```bash
cd app
cp .env.example .env.local   # opcional
npm install
npm run dev                  # http://localhost:3000
npm test                     # Vitest + RTL
npm run build
```

## Alcance Fase 6

- Theme persistente (`localStorage` + `prefers-color-scheme`)
- Wallet (Phantom) vía `@solana/wallet-adapter-*`
- Banner Pending / Success / Failed
- `error.tsx` / `not-found.tsx`
- Zod schemas base (`src/lib/schemas.ts`)

## Fase 7 (siguiente)

Formularios create/claim/cancel, Help modal y progress bar on-chain.
