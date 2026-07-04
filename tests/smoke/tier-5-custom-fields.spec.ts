/**
 * Tier 5 — Custom Fields overhaul.
 *
 * Custom Fields are now one card per field (name / abbreviation / type / "show
 * on" actor toggles) instead of sixteen flat rows. This verifies the card
 * renders those controls and that both a text edit and an actor-type checkbox
 * round-trip — the latter exercising the visibility bitmask rebuild in #onSubmit.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const NS = "nonex-ist-od6s";
const APP_ID = "nonex-ist-od6s-custom-fields-configuration";
// actorMasks: character:0, npc:1, creature:2, vehicle:3, starship:4
const NPC_BIT = 1 << 1;

// Original values, captured in the test and restored in afterAll.
let originalName = "";
let originalMask = 0;

test.describe.serial("custom fields overhaul", () => {
    test("renders a card per field and round-trips name + actor visibility", async ({page}) => {
        await loginAndWaitReady(page);

        const before = await evalInWorld(
            page,
            (ns: string) => ({
                name: window.game.settings.get(ns, "custom_field_1"),
                mask: Number(window.game.settings.get(ns, "custom_field_1_actor_types")) || 0,
            }),
            NS,
        );
        originalName = (before.name as string) ?? "";
        originalMask = before.mask;

        // Open the menu and confirm field 1's controls are present.
        const rendered = await evalInWorld(
            page,
            async (p: {ns: string}) => {
                const menu = window.game.settings.menus.get(`${p.ns}.custom_fields_menu`);
                const app = new menu.type();
                await app.render(true);
                const el: HTMLElement | undefined = (app as {element?: HTMLElement}).element;
                return {
                    cards: el?.querySelectorAll(".custom-field-card").length ?? 0,
                    hasName: !!el?.querySelector('input[name="custom_field_1"]'),
                    hasType: !!el?.querySelector('select[name="custom_field_1_type"]'),
                    npcBoxes: el?.querySelectorAll('input[name="custom_field_1_actor_types"][value="npc"]').length ?? 0,
                };
            },
            {ns: NS},
        );
        expect(rendered.cards).toBe(4);
        expect(rendered.hasName).toBe(true);
        expect(rendered.hasType).toBe(true);
        expect(rendered.npcBoxes).toBe(1);

        // Edit the name and toggle the NPC visibility checkbox.
        const npcWasChecked = (before.mask & NPC_BIT) !== 0;
        await evalInWorld(
            page,
            (p: {appId: string}) => {
                const app = [...window.foundry.applications.instances.values()].find(
                    (a: {id?: string}) => a.id === p.appId,
                ) as {element?: HTMLElement} | undefined;
                const el = app?.element;
                const name = el?.querySelector<HTMLInputElement>('input[name="custom_field_1"]');
                if (name) {
                    name.value = "SmokeField";
                    name.dispatchEvent(new Event("change", {bubbles: true}));
                }
                const npc = el?.querySelector<HTMLInputElement>('input[name="custom_field_1_actor_types"][value="npc"]');
                if (npc) {
                    npc.checked = !npc.checked;
                    npc.dispatchEvent(new Event("change", {bubbles: true}));
                }
            },
            {appId: APP_ID},
        );

        // Name persisted.
        await expect
            .poll(async () => evalInWorld(page, (ns: string) => window.game.settings.get(ns, "custom_field_1"), NS), {
                timeout: 8_000,
            })
            .toBe("SmokeField");

        // NPC visibility bit flipped exactly.
        const afterMask = await evalInWorld(
            page,
            (ns: string) => Number(window.game.settings.get(ns, "custom_field_1_actor_types")) || 0,
            NS,
        );
        expect((afterMask & NPC_BIT) !== 0, "NPC visibility bit should have toggled").toBe(!npcWasChecked);
        // Only the NPC bit changed — the rest of the mask is untouched.
        expect(afterMask & ~NPC_BIT).toBe(before.mask & ~NPC_BIT);
    });

    test.afterAll(async ({browser}) => {
        const context = await browser.newContext({baseURL: process.env.FOUNDRY_URL ?? "http://localhost:30000"});
        const page = await context.newPage();
        try {
            await loginAndWaitReady(page);
            await evalInWorld(
                page,
                async (p: {ns: string; name: string; mask: number; appId: string}) => {
                    await window.game.settings.set(p.ns, "custom_field_1", p.name);
                    await window.game.settings.set(p.ns, "custom_field_1_actor_types", p.mask);
                    const app = [...window.foundry.applications.instances.values()].find(
                        (a: {id?: string}) => a.id === p.appId,
                    ) as {close?: () => Promise<unknown>} | undefined;
                    await app?.close?.();
                },
                {ns: NS, name: originalName, mask: originalMask, appId: APP_ID},
            );
        } finally {
            await context.close();
        }
    });
});
