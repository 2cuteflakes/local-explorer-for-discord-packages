#!/usr/bin/env bash
#
# Sets up a local dev environment for Discord Data Package Explorer:
# checks for Node.js and Corepack/Yarn, offers to install whatever's
# missing, then installs project dependencies.
#
# Usage: ./setup.sh [--yes]
#   --yes   Don't prompt before installing anything (assume "yes").

set -euo pipefail

ASSUME_YES=false
for arg in "$@"; do
    case "$arg" in
        --yes|-y) ASSUME_YES=true ;;
    esac
done

REQUIRED_NODE_MAJOR=16
REQUIRED_YARN_VERSION="3.6.3"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

color() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
info()  { color "0;36" "==> $1"; }
ok()    { color "0;32" "OK: $1"; }
warn()  { color "1;33" "WARNING: $1"; }
fail()  { color "0;31" "ERROR: $1"; }

confirm() {
    # confirm "question" -> 0 (yes) or 1 (no)
    if [ "$ASSUME_YES" = true ]; then
        return 0
    fi
    read -r -p "$1 [y/N] " reply
    case "$reply" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

detect_pkg_manager() {
    if [ "$(uname)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
        echo "brew"
    elif command -v apt-get >/dev/null 2>&1; then
        echo "apt-get"
    elif command -v dnf >/dev/null 2>&1; then
        echo "dnf"
    elif command -v pacman >/dev/null 2>&1; then
        echo "pacman"
    else
        echo "none"
    fi
}

install_node_with() {
    case "$1" in
        brew) brew install node ;;
        apt-get) sudo apt-get update && sudo apt-get install -y nodejs npm ;;
        dnf) sudo dnf install -y nodejs npm ;;
        pacman) sudo pacman -Sy --noconfirm nodejs npm ;;
    esac
}

# --- Node.js ---------------------------------------------------------------

info "Checking for Node.js..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION="$(node -v)"
    NODE_MAJOR="$(echo "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)"
    if [ "$NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]; then
        ok "Node.js $NODE_VERSION found."
    else
        warn "Node.js $NODE_VERSION found, but version $REQUIRED_NODE_MAJOR or newer is recommended."
    fi
else
    warn "Node.js was not found on your PATH."
    PKG_MANAGER="$(detect_pkg_manager)"
    if [ "$PKG_MANAGER" != "none" ] && confirm "Install Node.js now using $PKG_MANAGER?"; then
        install_node_with "$PKG_MANAGER"
    else
        fail "Node.js is required. Install it from https://nodejs.org (or via nvm: https://github.com/nvm-sh/nvm) and re-run this script."
        exit 1
    fi
fi

# --- Corepack / Yarn ---------------------------------------------------------

info "Checking for Corepack (used to get the exact Yarn version this project pins)..."
if ! command -v corepack >/dev/null 2>&1; then
    warn "Corepack was not found. It ships with Node.js 16.9+ but may need a manual install on older setups."
    if confirm "Install Corepack now via npm?"; then
        npm install -g corepack
    else
        fail "Corepack is required to get the pinned Yarn version. Install it manually (npm install -g corepack) and re-run this script."
        exit 1
    fi
fi

info "Enabling Corepack and preparing Yarn $REQUIRED_YARN_VERSION..."
if ! corepack enable 2>/dev/null; then
    warn "Enabling Corepack without elevated permissions failed, retrying with sudo..."
    sudo corepack enable
fi
corepack prepare "yarn@$REQUIRED_YARN_VERSION" --activate

YARN_VERSION="$(yarn -v)"
if [ "$YARN_VERSION" = "$REQUIRED_YARN_VERSION" ]; then
    ok "Yarn $YARN_VERSION is active."
else
    warn "Expected Yarn $REQUIRED_YARN_VERSION but found $YARN_VERSION. Continuing anyway - Corepack should still pick the right version per-project via packageManager in package.json."
fi

# --- Install dependencies ---------------------------------------------------

info "Installing project dependencies with Yarn..."
(cd "$PROJECT_DIR" && yarn install)

ok "Setup complete!"
echo
echo "Next steps:"
echo "  yarn dev     # start the dev server with live-reload"
echo "  yarn build   # build for production"
echo "  yarn start   # serve the production build"
echo
echo "(Alternatively, run 'docker-compose up -d' to run the app in Docker - see README.md.)"
