#!/usr/bin/env bash
# Emits the CONTEXT7_API_KEY header for the context7 MCP server, sourcing the
# key from the gitignored .env (CONTEXT7_API_KEY) at connection time. Used via
# `headersHelper` in .mcp.json so bare `claude` resolves the key at startup and
# picks up rotations automatically — without baking it into any config.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_file="$script_dir/../.env"

key="$(grep -E '^CONTEXT7_API_KEY=' "$env_file" 2>/dev/null | head -1 | cut -d= -f2-)"
# Strip optional surrounding quotes (`op inject` preserves the quotes from
# .env.1password, so the materialized .env holds CONTEXT7_API_KEY="ctx7...").
key="${key%\"}"; key="${key#\"}"
key="${key%\'}"; key="${key#\'}"
if [ -z "$key" ]; then
  echo "mcp-context7-auth: CONTEXT7_API_KEY not found in $env_file" >&2
  exit 1
fi

printf '{"CONTEXT7_API_KEY":"%s"}\n' "$key"
