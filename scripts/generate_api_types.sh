#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IN="$ROOT_DIR/contracts/api/evaluate.v1.yaml"
OUT="$ROOT_DIR/packages/types/src/api.ts"
mkdir -p "$(dirname "$OUT")"
npx openapi-typescript "$IN" -o "$OUT"
echo "Generated: $OUT"
