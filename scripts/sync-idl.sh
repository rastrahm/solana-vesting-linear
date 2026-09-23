#!/usr/bin/env bash
# Sincroniza IDL + tipos TypeScript del programa hacia la app Next.js.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_IDL="$ROOT/target/idl/solana_vesting_linear.json"
SRC_TYPES="$ROOT/target/types/solana_vesting_linear.ts"
DEST_DIR="$ROOT/app/src/idl"

if [[ ! -f "$SRC_IDL" ]]; then
  echo "error: no existe $SRC_IDL — ejecutá 'anchor build' antes." >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SRC_IDL" "$DEST_DIR/solana_vesting_linear.json"

if [[ -f "$SRC_TYPES" ]]; then
  cp "$SRC_TYPES" "$DEST_DIR/solana_vesting_linear.ts"
else
  echo "warn: no se encontró $SRC_TYPES (solo se copió el JSON IDL)"
fi

echo "IDL sincronizado → app/src/idl/"
