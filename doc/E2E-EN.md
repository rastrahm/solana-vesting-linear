# E2E happy path — solana-vesting-linear

Manual end-to-end guide: local program → UI → create / claim / cancel.

## Prerequisites

- Node ≥ 20.18 (`nvm use`)
- Solana CLI + Anchor 0.31.x
- Phantom wallet (or compatible) pointing to **localhost**
- SOL funds in the local wallet (`solana airdrop 10`)

## 1. Validator + program

```bash
# Terminal A
solana-test-validator --reset

# Terminal B (repo root)
solana config set --url localhost
solana airdrop 10
bash scripts/localnet-deploy.sh
# or: anchor test --skip-local-validator   # if a validator is already running
```

Default localnet Program ID: `33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba`

## 2. UI

```bash
cd app
cp .env.example .env.local
# Adjust PROGRAM_ID if a redeploy changed the keypair
npm install
npm run dev
```

Open http://localhost:3000 · connect the wallet · cluster `localnet`.

## 3. Happy path

1. **Test mint** (CLI or your own script): create an SPL mint and mint tokens to your ATA.
2. **Create vesting** in the UI:
   - Beneficiary ≠ your pubkey
   - Mint from step 1
   - Amount > 0 (with the correct decimals)
   - `start ≤ cliff ≤ end` (unix)
   - Cancelable = on
3. Check in the explorer/locally: vault PDA balance = amount.
4. **Load vesting** (sender + beneficiary + mint):
   - The progress bar uses the **Clock sysvar** (not the browser clock).
5. **Claim** (sign with the beneficiary wallet; or set the schedule in the past for an immediate claim).
6. **Cancel** (sender, only if cancelable): vested → beneficiary, unvested → sender; accounts closed.

## 4. Automated verification

```bash
# On-chain + Sealevel
npm test                 # anchor test (mocha)

# Frontend unit/RTL
cd app && npm test && npm run build
```

## Notes

- After changing the program: `anchor build && bash scripts/sync-idl.sh`
- Compute budget: the current instructions pass on localnet without extra CU; if you see `Computational budget exceeded` on mainnet/devnet, add `ComputeBudgetProgram.setComputeUnitLimit` in the client (Phase 8+: not required on localnet).
