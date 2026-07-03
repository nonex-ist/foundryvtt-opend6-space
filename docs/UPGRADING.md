# Upgrading

## 3.0 — system ID renamed (`od6s` → `nonex-ist-od6s`)

Foundry treats a renamed ID as a **new system**, so **Update System**
won't offer 3.0 to a world on the old `od6s` system. Install 3.0 fresh,
then point your world at it.

Your actors, items, scenes, and journals live in the world, not the system
folder, so they carry over. On first load as GM the system migrates your
document flags from the old ID automatically. From **3.0.1** onwards it also
migrates your **world settings** (Wild Die faces, labels, deadliness, etc.) —
so no manual re-entry. The `latest` manifest below always installs a version
new enough; only a pinned `3.0.0` install migrates flags but not settings.

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
- **Already upgraded to 3.0.0 and re-entered your settings?** — updating to
  3.0.1 or newer copies any still-stranded `od6s.*` settings back on the next
  load. It won't overwrite values you've already re-entered under the new ID.
- **Blank character sheet** — unrelated; see
  [data-loss-recovery.md](data-loss-recovery.md).
