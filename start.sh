#!/usr/bin/env bash
#
# Builds and serves Discord Data Package Explorer.
#
# Usage: ./start.sh [--port <port>]
#   --port, -p   Port to serve on (default: 5000)

set -euo pipefail

PORT=5000

while [[ $# -gt 0 ]]; do
    case "$1" in
        --port|-p)
            PORT="${2:-}"
            shift 2
            ;;
        --port=*)
            PORT="${1#*=}"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--port <port>]"
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage: $0 [--port <port>]" >&2
            exit 1
            ;;
    esac
done

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "ERROR: '--port' must be a number between 1 and 65535 (got: '$PORT')." >&2
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

color() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
info()  { color "0;36" "==> $1"; }
fail()  { color "0;31" "ERROR: $1"; }

if [ ! -d node_modules ] || ! command -v yarn >/dev/null 2>&1; then
    fail "Dependencies aren't installed (or Yarn isn't available). Run ./setup.sh first."
    exit 1
fi

SIRV_BIN="node_modules/.bin/sirv"
if [ ! -x "$SIRV_BIN" ]; then
    fail "Couldn't find $SIRV_BIN. Run ./setup.sh (or 'yarn install') first."
    exit 1
fi

info "Building the app..."
yarn build

URL="http://localhost:$PORT"
info "Starting server..."
echo
color "1;32" "  Discord Data Package Explorer is running at: $URL"
echo

exec "$SIRV_BIN" public --single --dev --port "$PORT"
