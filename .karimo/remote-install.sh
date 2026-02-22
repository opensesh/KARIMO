#!/bin/bash
# remote-install.sh — Curl-friendly installer wrapper
# Usage: curl -sL https://raw.githubusercontent.com/opensesh/KARIMO/main/.karimo/remote-install.sh | bash -s /path/to/project

set -e

TARGET="${1:-.}"

# Resolve to absolute path
if [[ "$TARGET" != /* ]]; then
  TARGET="$(pwd)/$TARGET"
fi

# Validate target exists
if [[ ! -d "$TARGET" ]]; then
  echo "Error: Target directory does not exist: $TARGET"
  echo "Create it first or specify an existing directory."
  exit 1
fi

echo "Installing KARIMO to: $TARGET"
echo ""

# Create temp directory and ensure cleanup
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Clone KARIMO (shallow for speed)
echo "Downloading KARIMO..."
git clone --depth 1 --quiet https://github.com/opensesh/KARIMO.git "$TMPDIR/KARIMO"

# Run the actual installer
echo ""
bash "$TMPDIR/KARIMO/.karimo/install.sh" "$TARGET"
