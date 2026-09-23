# Frontend Next.js — Fase 6–7

App Router con tema, wallet, create/claim/cancel, progress (Clock) y Help.

## Comandos

```bash
cd app
cp .env.example .env.local
npm install
npm run dev
npm test
npm run build
```

## Flujo UI (Fase 7)

1. Conectar wallet (localnet/devnet según `.env`).
2. **Crear vesting**: beneficiary, mint, amount, schedule unix, cancelable.
3. **Cargar vesting** (sender + beneficiary + mint) → barra de progreso vía Clock sysvar.
4. **Claim** (beneficiary) / **Cancel** (sender, si cancelable).
5. **Help**: Cliff, Linear Unlock Rate, Revocability.

## IDL

`src/idl/solana_vesting_linear.json` (copiado desde `target/idl`). Re-sincronizar tras cambios on-chain:

```bash
cp ../target/idl/solana_vesting_linear.json src/idl/
cp ../target/types/solana_vesting_linear.ts src/idl/
```
