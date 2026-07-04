/**
 * Tier 5 — #189/3.0.2 legacy stored-label migration.
 *
 * Several labels are persisted as i18n key strings inside actor `system` data
 * (e.g. `system.characterpoints.short_label`) and rendered with `{{localize}}`.
 * The 3.0.0 rename moved the i18n root `OD6S.* → NONEX_IST_OD6S.*`, but stored
 * values on already-migrated documents still point at the retired root, so the
 * sheet shows the raw reference (`OD6S.Char_Char_Points_Short`) instead of the
 * label. `repairLegacyLabelKeys()` (migration.ts, gated at 3.0.2) rewrites them
 * on the next world load. This reads/writes live documents, so it lives here.
 *
 * The spec targets the exact reporter scenario — a world that already switched
 * to `nonex-ist-od6s` (migrationVersion 3.0.1) but whose actor still carries a
 * mixed-case `OD6S.*` label. It:
 *   - seeds a character with legacy keys in `system` (and confirms they persist);
 *   - rewinds `migrationVersion` to "3.0.1" so ONLY the new 3.0.2 step runs;
 *   - reloads (re-firing the `ready` hook → `migrateWorld`);
 *   - asserts the stored keys are rewritten to `NONEX_IST_OD6S.*`, that they now
 *     localize to real text (not the raw key), and that the version stamped 3.0.2.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const ACTOR_NAME = "smoke-label-migration";
// Mixed-case legacy keys exactly as the oldest worlds stored them. These map
// to real en.json keys, so the migration must rewrite them.
const LEGACY = {
    cpShort: "OD6S.Char_Char_Points_Short",
    cpLong: "OD6S.Char_Char_Points",
    chartype: "OD6S.Char_Type",
};
const EXPECTED = {
    cpShort: "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT",
    cpLong: "NONEX_IST_OD6S.CHAR_CHAR_POINTS",
    chartype: "NONEX_IST_OD6S.CHAR_TYPE",
};
// A legacy key with no current equivalent. The `game.i18n.has` guard must leave
// it untouched rather than mint a new broken `NONEX_IST_OD6S.*` reference.
const REMOVED_KEY = "OD6S.Some_Removed_Label";

test.describe.serial("legacy OD6S.* stored-label migration", () => {
    test("rewrites stored label keys on an already-switched world so sheets localize", async ({page}) => {
        await loginAndWaitReady(page);

        // ── Seed a character carrying legacy label keys ────────────────
        const seeded = await evalInWorld(
            page,
            async (p: {name: string; legacy: typeof LEGACY; removed: string}) => {
                type WorldActor = {name: string; delete: () => Promise<unknown>};
                // Clean slate: drop any leftover actor from a prior run.
                const leftover = ([...window.game.actors] as WorldActor[]).filter(a => a.name === p.name);
                for (const a of leftover) await a.delete();

                const actor = await window.Actor.create(
                    {
                        name: p.name,
                        type: "character",
                        system: {
                            characterpoints: {short_label: p.legacy.cpShort, label: p.legacy.cpLong},
                            chartype: {label: p.legacy.chartype},
                            species: {label: p.removed},
                        },
                    },
                    {render: false},
                );

                // Rewind so migrateWorld() runs ONLY the 3.0.2 label step — the
                // exact state of a world that already switched to the new id.
                await window.game.settings.set("nonex-ist-od6s", "migrationVersion", "3.0.1");

                const src = actor.system.toObject();
                return {
                    id: actor.id,
                    // Confirm the legacy values actually persisted pre-migration
                    // (i.e. the bug reproduces) before we assert the fix.
                    cpShort: src.characterpoints.short_label,
                    cpLong: src.characterpoints.label,
                    chartype: src.chartype.label,
                    species: src.species.label,
                };
            },
            {name: ACTOR_NAME, legacy: LEGACY, removed: REMOVED_KEY},
        );

        // Precondition: the seed reproduced the bug.
        expect(seeded.cpShort).toBe(LEGACY.cpShort);
        expect(seeded.cpLong).toBe(LEGACY.cpLong);
        expect(seeded.chartype).toBe(LEGACY.chartype);
        expect(seeded.species).toBe(REMOVED_KEY);

        // ── Reload: full navigation re-fires init/ready → migrateWorld ─
        await loginAndWaitReady(page);

        const result = await evalInWorld(
            page,
            (p: {id: string}) => {
                const actor = window.game.actors.get(p.id);
                const src = actor.system.toObject();
                const loc = (k: string) => window.game.i18n.localize(k);
                return {
                    cpShort: src.characterpoints.short_label,
                    cpLong: src.characterpoints.label,
                    chartype: src.chartype.label,
                    species: src.species.label,
                    // The rendered strings the sheet would show post-migration.
                    cpShortText: loc(src.characterpoints.short_label),
                    chartypeText: loc(src.chartype.label),
                    version: window.game.settings.get("nonex-ist-od6s", "migrationVersion"),
                };
            },
            {id: seeded.id},
        );

        // Stored keys rewritten to the current root.
        expect(result.cpShort).toBe(EXPECTED.cpShort);
        expect(result.cpLong).toBe(EXPECTED.cpLong);
        expect(result.chartype).toBe(EXPECTED.chartype);
        // Removed-key guard: no current equivalent → left exactly as-is.
        expect(result.species).toBe(REMOVED_KEY);

        // The whole point: the sheet now shows a localized label, not a raw key.
        expect(result.cpShortText).not.toMatch(/^(OD6S|NONEX_IST_OD6S)\./);
        expect(result.cpShortText.length).toBeGreaterThan(0);
        expect(result.chartypeText).not.toMatch(/^(OD6S|NONEX_IST_OD6S)\./);

        // Migration ran and stamped the current version.
        expect(result.version).toBe("3.0.2");
    });

    test.afterAll(async ({browser}) => {
        // Remove the synthetic actor so re-runs start clean. Use an explicit
        // context with the config baseURL — browser.newPage() bypasses the
        // fixtures' baseURL, and loginAndWaitReady() navigates to a relative "/".
        const context = await browser.newContext({
            baseURL: process.env.FOUNDRY_URL ?? "http://localhost:30000",
        });
        const page = await context.newPage();
        try {
            await loginAndWaitReady(page);
            await evalInWorld(
                page,
                async (p: {name: string}) => {
                    type WorldActor = {name: string; delete: () => Promise<unknown>};
                    const leftover = ([...window.game.actors] as WorldActor[]).filter(a => a.name === p.name);
                    for (const a of leftover) await a.delete();
                },
                {name: ACTOR_NAME},
            );
        } finally {
            await context.close();
        }
    });
});
