#!/bin/zsh
cd "$(dirname "$0")"
node tools/add-work.mjs
echo ""
echo "Press any key to close."
read -k 1
