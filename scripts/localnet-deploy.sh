#!/usr/bin/env bash
# Build + deploy del programa a un validator local ya corriendo, y sync IDL a la UI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null 2>&1 || true

echo "==> anchor build"
anchor build

PROGRAM_SO="target/deploy/solana_vesting_linear.so"
PROGRAM_ID="$(solana address -k target/deploy/solana_vesting_linear-keypair.json)"

echo "==> program id: $PROGRAM_ID"
echo "==> deploy (requiere solana-test-validator / RPC local en 8899)"
solana program deploy "$PROGRAM_SO" \
  --program-id target/deploy/solana_vesting_linear-keypair.json \
  --url localhost

bash "$ROOT/scripts/sync-idl.sh"

echo ""
echo "Listo. Configurá la app:"
echo "  NEXT_PUBLIC_PROGRAM_ID=$PROGRAM_ID"
echo "  NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899"
echo "  cd app && npm run dev"
