#!/usr/bin/env bash
# Emits the Authorization header for the github MCP server, sourcing the token
# from the gitignored .env (GITHUB_PAT) at connection time. Used via
# `headersHelper` in .mcp.json so bare `claude` resolves the token at startup
# and picks up rotations automatically — without baking it into any config.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_file="$script_dir/../.env"

pat="$(grep -E '^GITHUB_PAT=' "$env_file" 2>/dev/null | head -1 | cut -d= -f2-)"
# Strip optional surrounding quotes (`op inject` preserves the quotes from
# .env.1password, so the materialized .env holds GITHUB_PAT="ghp_...").
pat="${pat%\"}"; pat="${pat#\"}"
pat="${pat%\'}"; pat="${pat#\'}"
if [ -z "$pat" ]; then
  echo "mcp-github-auth: GITHUB_PAT not found in $env_file" >&2
  exit 1
fi

printf '{"Authorization":"Bearer %s"}\n' "$pat"
