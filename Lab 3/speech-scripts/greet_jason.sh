#!/usr/bin/env bash
# Part 1A: greet Jason with the Piper voice used in this lab.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VOICES_DIR="$SCRIPT_DIR/../voices"

python3 -m piper \
  --model en_US-lessac-medium \
  --data-dir "$VOICES_DIR" \
  --output-raw \
  -- "Hello Jason, welcome back. I'm ready to listen." \
  | aplay -r 22050 -f S16_LE -t raw -
