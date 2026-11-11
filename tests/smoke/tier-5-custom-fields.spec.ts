/**
 * Tier 5 — Custom Fields (dynamic slots, #199).
 *
 * Custom Fields are a dynamic list stored in the array-valued `custom_fields`
 * setting: one card per field (name / abbreviation / type / "show on" actor
 * toggles) plus add/delete controls. This verifies adding a field through the
 * menu and that a name edit and an actor-type checkbox round-trip into the
 * stored definition (the latter exercising the visibility bitmask rebuild in
 * #onSubmit), and that deleting the field pops the confirmation dialog with
 * its actor-impact count, removes the definition, and keeps the orphaned
 * per-actor value.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const NS = "nonex-ist-od6s";
const APP_ID = "nonex-ist-od6s-custom-fields-configuration";
// actorMasks: character:0, npc:1, creature:2, vehicle:3, starship:4
const NPC_BIT = 1 << 1;

type StoredField = {id: string; name: string; short: string; type: string; actorTypes: number};

// Definitions as they were before the test, restored in afterAll.
let originalDefs: StoredField[] = [];
// Id of the field added by the first test; the delete test removes it.
let fieldId = "";

test.describe.serial("custom fields dynamic slots", () => {
    test("adds a field and round-trips name + actor visibility", async ({page}) => {
        await loginAndWaitReady(page);

        originalDefs = (await evalInWorld(
            page,
            (ns: string) => window.game.settings.get(ns, "custom_fields"),
            NS,
        )) as StoredField[] ?? [];

        // Open the menu and add a field through the UI action.
        const added = await evalInWorld(
            page,
            async (p: {ns: string}) => {
                const menu = window.game.settings.menus.get(`${p.ns}.custom_fields_menu`);
                const app = new menu.type();
                await app.render(true);
                const el: HTMLElement | undefined = (app as {element?: HTMLElement}).element;
                el?.querySelector<HTMLButtonElement>('button[data-action="addField"]')?.click();
                // The action saves the setting then re-renders; give it a beat.
                await new Promise((r) => setTimeout(r, 500));
                const defs = window.game.settings.get(p.ns, "custom_fields") as {id: string}[];
                return {count: defs.length, lastId: defs.at(-1)?.id ?? ""};
            },
            {ns: NS},
        );
        expect(added.count).toBe(originalDefs.length + 1);
        fieldId = added.lastId;
        expect(fieldId).not.toBe("");

        // The new card renders name/type controls and one NPC visibility box.
        const rendered = await evalInWorld(
            page,
            (p: {appId: string; id: string}) => {
                const app = [...window.foundry.applications.instances.values()].find(
                    (a: {id?: string}) => a.id === p.appId,
                ) as {element?: HTMLElement} | undefined;
                const el = app?.element;
                return {
                    cards: el?.querySelectorAll(".custom-field-card").length ?? 0,
                    hasName: !!el?.querySelector(`input[name="defs.${p.id}.name"]`),
                    hasType: !!el?.querySelector(`select[name="defs.${p.id}.type"]`),
                    npcBoxes: el?.querySelectorAll(
                        `input[type="checkbox"][name="defs.${p.id}.actorTypes"][value="npc"]`,
                    ).length ?? 0,
                };
            },
            {appId: APP_ID, id: fieldId},
        );
        expect(rendered.cards).toBe(originalDefs.length + 1);
        expect(rendered.hasName).toBe(true);
        expect(rendered.hasType).toBe(true);
        expect(rendered.npcBoxes).toBe(1);

        // Edit the name and tick the NPC visibility checkbox.
        await evalInWorld(
            page,
            (p: {appId: string; id: string}) => {
                const app = [...window.foundry.applications.instances.values()].find(
                    (a: {id?: string}) => a.id === p.appId,
                ) as {element?: HTMLElement} | undefined;
                const el = app?.element;
                const name = el?.querySelector<HTMLInputElement>(`input[name="defs.${p.id}.name"]`);
                if (name) {
                    name.value = "SmokeField";
                    name.dispatchEvent(new Event("change", {bubbles: true}));
                }
                const npc = el?.querySelector<HTMLInputElement>(
                    `input[type="checkbox"][name="defs.${p.id}.actorTypes"][value="npc"]`,
                );
                if (npc) {
                    npc.checked = true;
                    npc.dispatchEvent(new Event("change", {bubbles: true}));
                }
            },
            {appId: APP_ID, id: fieldId},
        );

        // Name + NPC bit persisted into the stored definition; the default
        // character bit survives the mask rebuild.
        await expect
            .poll(
                async () =>
                    evalInWorld(
                        page,
                        (p: {ns: string; id: string}) => {
                            const defs = window.game.settings.get(p.ns, "custom_fields") as StoredField[];
                            const def = defs.find((d) => d.id === p.id);
                            return def ? {name: def.name, npc: (def.actorTypes & 2) !== 0, character: (def.actorTypes & 1) !== 0} : null;
                        },
                        {ns: NS, id: fieldId},
                    ),
                {timeout: 8_000},
            )
            .toEqual({name: "SmokeField", npc: true, character: true});
    });

    test("deleting the field confirms with actor impact and keeps orphaned values", async ({page}) => {
        await loginAndWaitReady(page);
        expect(fieldId, "field id from the add test").not.toBe("");

        // Give one actor a value in the field so the impact line counts it.
        await evalInWorld(
            page,
            async (p: {id: string}) => {
                const stale = window.game.actors.filter((a: any) => a.name === "smoke-cf-impact").map((a: any) => a.id);
                if (stale.length) await window.Actor.deleteDocuments(stale);
                const actor = await window.Actor.create({name: "smoke-cf-impact", type: "character"}, {render: false});
                await actor.update({[`system.customfields.${p.id}`]: "keep"});
            },
            {id: fieldId},
        );

        await evalInWorld(
            page,
            async (ns: string) => {
                const menu = window.game.settings.menus.get(`${ns}.custom_fields_menu`);
                await new menu.type().render(true);
            },
            NS,
        );

        await page.locator(`#${APP_ID} button[data-action="deleteField"][data-id="${fieldId}"]`).click();

        const confirm = page.locator("dialog").filter({has: page.locator('button[data-action="yes"]')}).last();
        await expect(confirm, "delete should open a confirmation dialog").toBeVisible();
        await expect(confirm, "dialog should state how many actors hold data").toContainText("1 actor");
        await confirm.locator('button[data-action="yes"]').click();

        await expect
            .poll(
                async () =>
                    evalInWorld(
                        page,
                        (p: {ns: string; id: string}) => {
                            const defs = window.game.settings.get(p.ns, "custom_fields") as StoredField[];
                            return defs.some((d) => d.id === p.id);
                        },
                        {ns: NS, id: fieldId},
                    ),
                {timeout: 8_000, message: "definition should be removed after confirming"},
            )
            .toBe(false);

        // Deleting the definition orphans, but must not destroy, actor values.
        const retained = await evalInWorld(
            page,
            (p: {id: string}) => {
                const actor = window.game.actors.find((a: any) => a.name === "smoke-cf-impact");
                return actor?.system?.customfields?.[p.id] ?? null;
            },
            {id: fieldId},
        );
        expect(retained, "orphaned value stays on the actor").toBe("keep");
    });

    test.afterAll(async ({browser}) => {
        const context = await browser.newContext({baseURL: process.env.FOUNDRY_URL ?? "http://localhost:30000"});
        const page = await context.newPage();
        try {
            await loginAndWaitReady(page);
            await evalInWorld(
                page,
                async (p: {ns: string; defs: StoredField[]; appId: string}) => {
                    await window.game.settings.set(p.ns, "custom_fields", p.defs);
                    const impact = window.game.actors.find((a: any) => a.name === "smoke-cf-impact");
                    await impact?.delete();
                    const app = [...window.foundry.applications.instances.values()].find(
                        (a: {id?: string}) => a.id === p.appId,
                    ) as {close?: () => Promise<unknown>} | undefined;
                    await app?.close?.();
                },
                {ns: NS, defs: originalDefs, appId: APP_ID},
            );
        } finally {
            await context.close();
        }
    });
});
