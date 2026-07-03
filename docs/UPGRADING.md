# Upgrading

## 3.0 — system ID renamed (`od6s` → `nonex-ist-od6s`)

Foundry treats a renamed ID as a **new system**, so **Update System**
won't offer 3.0 to a world on the old `od6s` system. Install 3.0 fresh,
then point your world at it.

Your actors, items, scenes, and journals live in the world, not the system
folder, so they carry over. On first load as GM the system also migrates
your document flags **and your world settings** (Wild Die faces, labels,
deadliness, etc.) from the old ID automatically — no manual re-entry.

### Steps

1. **Back up** `Data/worlds/<your-world>/` — step 4 edits it by hand.
2. **Install** via Setup → Install System, manifest URL:
   `https://github.com/nonex-ist/foundryvtt-opend6-space/releases/latest/download/system.json`
   (installs alongside the old `od6s`; both can coexist).
3. Ensure [socketlib](https://foundryvtt.com/packages/socketlib) is installed.
4. **Repoint the world** (Foundry has no UI for this): with the world not
   running, edit `Data/worlds/<your-world>/world.json` and change
   `"system": "od6s"` to `"system": "nonex-ist-od6s"`.
5. **Launch** the world as GM — flags and settings migrate automatically —
   and enable socketlib for it.
6. **Spot-check** your values under Game Settings → Configure Settings →
   System Settings.
7. Once verified, uninstall the old `od6s` system.

### Troubleshooting

- **"System is not installed" on launch** — step 2 didn't finish, or the
  `system` value has a typo; it must be exactly `"nonex-ist-od6s"`.
- **A setting didn't carry over** — the migration skips any value you'd
  already set under the new ID, and drops settings this version no longer
  has. Re-set it under System Settings (step 6).
- **Blank character sheet** — unrelated; see
  [data-loss-recovery.md](data-loss-recovery.md).
