/**
 * Tier 5 — #189 DM Maintenance tools ("Repair legacy labels").
 *
 * The Maintenance settings menu (config-maintenance.ts) lets a GM re-run the
 * stored-label repair by hand — useful after importing legacy actors into a
 * world whose one-shot migration has already passed. The button delegates to
 * the same `repairLegacyLabelKeys()` the auto-migration uses.
 *
 * This exercises the UI path end-to-end: it seeds an actor carrying a legacy
 * `OD6S.*` label *after* load (so the automatic migration never touches it),
 * opens the Maintenance app via its registered settings menu, clicks the
 * repair button through the app's own DOM, and asserts the stored key is
 * rewritten and now localizes. `migrationVersion` is left untouched — this is
 * purely the manual tool, not a version-gated step.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const ACTOR_NAME = "smoke-maintenance-repair";
const LEGACY_CP_SHORT = "OD6S.Char_Char_Points_Short";
const EXPECTED_CP_SHORT = "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT";
const MENU_KEY = "nonex-ist-od6s.maintenance_menu";
const APP_ID = "nonex-ist-od6s-maintenance-configuration";

test.describe.serial("DM maintenance: repair legacy labels", () => {
    test("the Maintenance menu button rewrites stored legacy label keys", async ({page}) => {
        await loginAndWaitReady(page);

        // ── Seed a character with a legacy label AFTER load ────────────
        const seeded = await evalInWorld(
            page,
            async (p: {name: string; legacy: string; menuKey: string}) => {
                type WorldActor = {name: string; delete: () => Promise<unknown>};
                const leftover = ([...window.game.actors] as WorldActor[]).filter(a => a.name === p.name);
                for (const a of leftover) await a.delete();

                const actor = await window.Actor.create(
                    {
                        name: p.name,
                        type: "character",
                        system: {characterpoints: {short_label: p.legacy}},
                    },
                    {render: false},
                );

                // Open the Maintenance app through its registered settings menu,
                // exactly as clicking it in the Settings sidebar would.
                const menu = window.game.settings.menus.get(p.menuKey);
                const app = new menu.type();
                await app.render(true);

                return {id: actor.id, stored: actor.system.toObject().characterpoints.short_label};
            },
            {name: ACTOR_NAME, legacy: LEGACY_CP_SHORT, menuKey: MENU_KEY},
        );

        // Precondition: the legacy key persisted and the migration didn't touch it.
        expect(seeded.stored).toBe(LEGACY_CP_SHORT);

        // ── Click the "Repair legacy labels" button in the app DOM ─────
        const clicked = await evalInWorld(
            page,
            (p: {appId: string}) => {
                const app = [...window.foundry.applications.instances.values()].find(
                    (a: {id?: string}) => a.id === p.appId,
                ) as {element?: HTMLElement} | undefined;
                const button = app?.element?.querySelector<HTMLButtonElement>(
                    'button[data-action="repairLabels"]',
                );
                if (!button) return false;
                button.click();
                return true;
            },
            {appId: APP_ID},
        );
        expect(clicked, "repair button found and clicked").toBe(true);

        // The repair awaits document updates, so poll the stored value.
        await expect
            .poll(
                async () =>
                    evalInWorld(
                        page,
                        (p: {id: string}) =>
                            window.game.actors.get(p.id).system.toObject().characterpoints.short_label,
                        {id: seeded.id},
                    ),
                {timeout: 10_000, message: "stored short_label should be rewritten"},
            )
            .toBe(EXPECTED_CP_SHORT);

        // And it localizes to real text now, not a raw key.
        const text = await evalInWorld(
            page,
            (p: {id: string}) =>
                window.game.i18n.localize(
                    window.game.actors.get(p.id).system.toObject().characterpoints.short_label,
                ),
            {id: seeded.id},
        );
        expect(text).not.toMatch(/^(OD6S|NONEX_IST_OD6S)\./);
        expect(text.length).toBeGreaterThan(0);
    });

    test.afterAll(async ({browser}) => {
        const context = await browser.newContext({
            baseURL: process.env.FOUNDRY_URL ?? "http://localhost:30000",
        });
        const page = await context.newPage();
        try {
            await loginAndWaitReady(page);
            await evalInWorld(
                page,
                async (p: {name: string; appId: string}) => {
                    type WorldActor = {name: string; delete: () => Promise<unknown>};
                    const leftover = ([...window.game.actors] as WorldActor[]).filter(a => a.name === p.name);
                    for (const a of leftover) await a.delete();
                    // Close the Maintenance app if it's still open.
                    const app = [...window.foundry.applications.instances.values()].find(
                        (a: {id?: string; close?: () => Promise<unknown>}) => a.id === p.appId,
                    ) as {close?: () => Promise<unknown>} | undefined;
                    await app?.close?.();
                },
                {name: ACTOR_NAME, appId: APP_ID},
            );
        } finally {
            await context.close();
        }
    });
});
