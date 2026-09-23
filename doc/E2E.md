# Flujo E2E feliz — solana-vesting-linear

Guía manual extremo a extremo: programa local → UI → create / claim / cancel.

## Prerrequisitos

- Node ≥ 20.18 (`nvm use`)
- Solana CLI + Anchor 0.31.x
- Wallet Phantom (o compatible) apuntando a **localhost**
- Fondos SOL en la wallet local (`solana airdrop 10`)

## 1. Validator + programa

```bash
# Terminal A
solana-test-validator --reset

# Terminal B (repo root)
solana config set --url localhost
solana airdrop 10
bash scripts/localnet-deploy.sh
# o: anchor test --skip-local-validator   # si ya hay validator
```

Program ID localnet por defecto: `33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba`

## 2. UI

```bash
cd app
cp .env.example .env.local
# Ajustá PROGRAM_ID si redeploy cambió el keypair
npm install
npm run dev
```

Abrí http://localhost:3000 · conectá wallet · cluster `localnet`.

## 3. Happy path

1. **Mint de prueba** (CLI o script propio): creá un mint SPL, mint tokens a tu ATA.
2. **Crear vesting** en la UI:
   - Beneficiary ≠ tu pubkey
   - Mint del paso 1
   - Amount > 0 (con decimals correctos)
   - `start ≤ cliff ≤ end` (unix)
   - Cancelable = on
3. Verificá en explorer/local: vault PDA con balance = amount.
4. **Cargar vesting** (sender + beneficiary + mint):
   - Progress bar usa **Clock sysvar** (no el reloj del browser).
5. **Claim** (firmá con la wallet del beneficiary; o ajustá schedule al pasado para claim inmediato).
6. **Cancel** (sender, solo si cancelable): vested→beneficiary, unvested→sender; cuentas cerradas.

## 4. Verificación automatizada

```bash
# On-chain + Sealevel
npm test                 # anchor test (mocha)

# Frontend unit/RTL
cd app && npm test && npm run build
```

## Notas

- Tras cambiar el programa: `anchor build && bash scripts/sync-idl.sh`
- Compute budget: las instrucciones actuales pasan en localnet sin CU extra; si en mainnet/devnet ves `Computational budget exceeded`, agregá `ComputeBudgetProgram.setComputeUnitLimit` en el client (Fase 8+: no requerido en localnet).
