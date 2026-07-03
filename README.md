# OpenD6 Space

[![CI](https://github.com/nonex-ist/foundryvtt-opend6-space/actions/workflows/ci.yml/badge.svg)](https://github.com/nonex-ist/foundryvtt-opend6-space/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Foundry v14](https://img.shields.io/badge/Foundry-v14-orange.svg)](https://foundryvtt.com/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

A [Foundry VTT](https://foundryvtt.com/) game system for **OpenD6 Space**,
implementing the rules from the [OpenD6 Project SRD](http://opend6project.org)
and content from the [OpenD6 Space rulebook](https://ogc.rpglibrary.org/index.php?title=OpenD6).

System code is [MIT-licensed](LICENSE). The ruleset content is released
under the OGL v1.0a.

## Motivation

Built so my brother can keep having awesome adventures in space.

## Compatibility

| System version | Foundry VTT |
| -------------- | ----------- |
| 3.x            | v14         |
| 2.x            | v14         |

## Requirements

- Foundry VTT **v14** (minimum 14, maximum 14)
- [socketlib](https://foundryvtt.com/packages/socketlib) module — must be
  installed and active

## Installation

In Foundry VTT, use this manifest URL under **Game Systems → Install System**:

```text
https://github.com/nonex-ist/foundryvtt-opend6-space/releases/latest/download/system.json
```

That URL always resolves to the latest stable release. To pin a
specific version, use the tagged form:

```text
https://github.com/nonex-ist/foundryvtt-opend6-space/releases/download/v<version>/system.json
```

### Verifying the download

Releases are signed with [cosign](https://docs.sigstore.dev/) keyless
signing — see [CONTRIBUTING.md](CONTRIBUTING.md#verifying-a-release)
for the verify command. Each release also ships a CycloneDX SBOM
(`sbom.cdx.json`) and a SHA-256 checksum (`nonex-ist-od6s.zip.sha256`).

## Upgrading

Version 3.0 renamed the system ID (`od6s` → `nonex-ist-od6s`), so Foundry
treats it as a new system rather than an in-place update. See
[docs/UPGRADING.md](docs/UPGRADING.md) for the step-by-step migration.

## Configuration

System rules can be tailored under **Game Settings → Configure Settings →
System Settings**. See the [System Settings wiki page](https://github.com/nonex-ist/foundryvtt-opend6-space/wiki/System-Settings)
for a tour of the options.

## Localization

All player-facing text is routed through Foundry's localization system.
If you find a string that bypasses it, please open an issue.

Translations are community-contributed:

- French — [@dryasredrock](https://gitlab.com/dryasredrock)
- Spanish — Skorbuto McFly
- Russian — Zmeugat

## Development

```bash
pnpm install         # install dependencies
pnpm run build       # bundle JS, compile SCSS, build packs + translations
pnpm run watch       # rebuild JS/SCSS on change
pnpm run check       # lint + typecheck + tests
```

The bundle is built with esbuild → `src/module/nonex-ist-od6s.js`. SCSS compiles
to `src/css/nonex-ist-od6s.css`. Compendium packs are authored as YAML in
`compendia/` and built to LevelDB packs in `src/packs/` via
`@foundryvtt/foundryvtt-cli`.

### Smoke tests against a live Foundry

```bash
pnpm exec playwright install chromium   # one-time
pnpm run test:smoke                     # runs all smoke specs
pnpm run test:smoke:ui                  # interactive Playwright UI
```

Requires a Foundry world running with `nonex-ist-od6s` selected. Defaults to
`http://localhost:30000` and user `Gamemaster` with no password;
override via `FOUNDRY_URL`, `FOUNDRY_USER`, `FOUNDRY_PASSWORD`.

The specs reuse the same probes documented in
[docs/test-runbook.md](docs/test-runbook.md) — boot/registration,
sheet rendering, settings forms, roll flow, wound transitions, and
combat.

See the [architecture notes](docs/ARCHITECTURE.md) for an overview of the
module layout and conventions — or run `/init` in Claude Code to regenerate
them.

## Contributing

- Bugs and feature requests: [GitHub Issues](https://github.com/nonex-ist/foundryvtt-opend6-space/issues)
- Discussion: [Discord](https://discord.gg/nh925pW2rU)

## Acknowledgements

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for prior-work credits and asset
attributions.
