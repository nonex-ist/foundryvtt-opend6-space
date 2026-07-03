/**
 * Tier 5 — #181/3.0.1 legacy world-settings migration.
 *
 * The 3.0.0 system-id rename left world settings stranded under the old
 * `od6s.*` namespace. `migrateLegacySettings()` (migration.ts, gated at
 * 3.0.1) copies them onto `nonex-ist-od6s.*` on the next world load. This
 * can't be a unit test — it reads/writes `game.settings.storage` on a live
 * world — so it lives here.
 *
 * The spec seeds a synthetic upgraded world, forces the migration to re-run
 * by rewinding `migrationVersion`, reloads (re-firing the `ready` hook), and
 * asserts:
 *   - a legacy `od6s.*` value is copied to `nonex-ist-od6s.*`;
 *   - `systems/od6s/` asset paths are rewritten to `systems/nonex-ist-od6s/`;
 *   - a value already set under the new id is NOT clobbered.
 *
 * Seeds mirror the exact encoding of a real Setting document (copied from a
 * value written via `game.settings.set`) so the test is agnostic to how the
 * running Foundry serializes `Setting#value`.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const ONE_KEY = "wild_die_one_face";
const SIX_KEY = "wild_die_six_face";
// Legacy values as a real upgraded world would hold them: pointing at the
// old system folder, so they also exercise the `systems/od6s/` path rewrite.
const LEGACY_ONE = "systems/od6s/icons/smoke-migrated-one.svg";
const LEGACY_SIX = "systems/od6s/icons/smoke-migrated-six.svg";
// Expected copy target after the od6s → nonex-ist-od6s path rewrite.
const MIGRATED_ONE = "systems/nonex-ist-od6s/icons/smoke-migrated-one.svg";
// A value the GM already customised under the new id — must survive untouched.
const PRESET_SIX = "systems/nonex-ist-od6s/icons/smoke-preset-six.svg";

test.describe.serial("legacy od6s.* world settings migration", () => {
    test("copies stranded settings, rewrites paths, and preserves new-id values", async ({page}) => {
        await loginAndWaitReady(page);

        // ── Seed a synthetic upgraded world ────────────────────────────
        await evalInWorld(
            page,
            async (p: {oneKey: string; sixKey: string; legacyOne: string; legacySix: string; presetSix: string}) => {
                const settings = window.game.settings;
                const world = settings.storage.get("world");
                const SettingCls = world.documentClass ?? window.foundry.documents.Setting;
                const findDoc = (key: string) => [...world].find((s: {key: string}) => s.key === key);
                const delDoc = async (key: string) => {
                    const d = findDoc(key);
                    if (d) await d.delete();
                };

                // Clean slate for both new-id keys and their legacy twins.
                await delDoc(`od6s.${p.oneKey}`);
                await delDoc(`od6s.${p.sixKey}`);
                await delDoc(`nonex-ist-od6s.${p.oneKey}`);
                await delDoc(`nonex-ist-od6s.${p.sixKey}`);

                // Write the legacy values through the real setter first so we
                // learn this Foundry's exact Setting#value encoding, then mint
                // `od6s.*` docs that mirror it byte-for-byte.
                await settings.set("nonex-ist-od6s", p.oneKey, p.legacyOne);
                await settings.set("nonex-ist-od6s", p.sixKey, p.legacySix);
                const oneEnc = findDoc(`nonex-ist-od6s.${p.oneKey}`).value;
                const sixEnc = findDoc(`nonex-ist-od6s.${p.sixKey}`).value;
                await SettingCls.create({key: `od6s.${p.oneKey}`, value: oneEnc});
                await SettingCls.create({key: `od6s.${p.sixKey}`, value: sixEnc});

                // one_face: unset under the new id → migration should copy it.
                await delDoc(`nonex-ist-od6s.${p.oneKey}`);
                // six_face: already customised under the new id → must be kept.
                await settings.set("nonex-ist-od6s", p.sixKey, p.presetSix);

                // Rewind so `migrateWorld()` runs only the 3.0.1 settings step
                // (the ≤2.6.0 steps stay gated out; flag copy is a harmless no-op).
                await settings.set("nonex-ist-od6s", "migrationVersion", "3.0.0");
            },
            {oneKey: ONE_KEY, sixKey: SIX_KEY, legacyOne: LEGACY_ONE, legacySix: LEGACY_SIX, presetSix: PRESET_SIX},
        );

        // ── Reload: full navigation re-fires init/ready → migrateWorld ─
        await loginAndWaitReady(page);

        const result = await evalInWorld(
            page,
            (p: {oneKey: string; sixKey: string}) => {
                const s = window.game.settings;
                return {
                    one: s.get("nonex-ist-od6s", p.oneKey),
                    six: s.get("nonex-ist-od6s", p.sixKey),
                    version: s.get("nonex-ist-od6s", "migrationVersion"),
                };
            },
            {oneKey: ONE_KEY, sixKey: SIX_KEY},
        );

        // Copied from od6s.* and path-rewritten to the new system folder.
        expect(result.one).toBe(MIGRATED_ONE);
        // Pre-existing new-id value left untouched (no clobber).
        expect(result.six).toBe(PRESET_SIX);
        // Migration ran and stamped the current version.
        expect(result.version).toBe("3.0.1");
    });

    test.afterAll(async ({browser}) => {
        // Restore defaults so re-runs start clean and the smoke world isn't
        // left with synthetic icon paths.
        const page = await browser.newPage();
        try {
            await loginAndWaitReady(page);
            await evalInWorld(
                page,
                async (p: {oneKey: string; sixKey: string}) => {
                    const world = window.game.settings.storage.get("world");
                    const delDoc = async (key: string) => {
                        const d = [...world].find((s: {key: string}) => s.key === key);
                        if (d) await d.delete();
                    };
                    for (const k of [
                        `od6s.${p.oneKey}`,
                        `od6s.${p.sixKey}`,
                        `nonex-ist-od6s.${p.oneKey}`,
                        `nonex-ist-od6s.${p.sixKey}`,
                    ]) {
                        await delDoc(k);
                    }
                },
                {oneKey: ONE_KEY, sixKey: SIX_KEY},
            );
        } finally {
            await page.close();
        }
    });
});
