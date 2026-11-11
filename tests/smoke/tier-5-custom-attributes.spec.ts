/**
 * Tier 5 — Custom Attributes (dynamic slots, #199).
 *
 * Custom attributes are a dynamic list stored in the array-valued
 * `custom_attributes` setting, managed from the dedicated Custom Attributes
 * menu (name + abbreviation + active per row, plus add/delete). This verifies:
 *   - Custom Labels renders no per-attribute CA inputs;
 *   - the menu can add a row, and a name edit persists into the stored
 *     definition;
 *   - deleting the row pops the confirmation dialog with its actor-impact
 *     count and removes the definition.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const NS = "nonex-ist-od6s";
const APP_ID = "nonex-ist-od6s-custom-attributes-configuration";

type StoredAttr = {id: string; name: string; short: string; active: boolean};

test.describe.serial("custom attributes dynamic slots", () => {
    test("CA config lives in its own menu and persists edits", async ({page}) => {
        await loginAndWaitReady(page);

        // Custom Labels must not contain CA inputs.
        const labelsHasCA = await evalInWorld(
            page,
            async (ns: string) => {
                const menu = window.game.settings.menus.get(`${ns}.custom_labels_menu`);
                const app = new menu.type();
                await app.render(true);
                const el: HTMLElement | undefined = (app as {element?: HTMLElement}).element;
                const found = !!el?.querySelector('[name^="customize_ca"]');
                await (app as {close?: () => Promise<unknown>}).close?.();
                return found;
            },
            NS,
        );
        expect(labelsHasCA, "Custom Labels should not render CA inputs").toBe(false);

        const originalDefs = (await evalInWorld(
            page,
            (ns: string) => window.game.settings.get(ns, "custom_attributes"),
            NS,
        )) as StoredAttr[] ?? [];

        // Add a row through the menu, then rename it.
        const result = await evalInWorld(
            page,
            async (ns: string) => {
                const menu = window.game.settings.menus.get(`${ns}.custom_attributes_menu`);
                const app = new menu.type();
                await app.render(true);
                let el: HTMLElement | undefined = (app as {element?: HTMLElement}).element;
                el?.querySelector<HTMLButtonElement>('button[data-action="addAttribute"]')?.click();
                await new Promise((r) => setTimeout(r, 500));

                const defs = window.game.settings.get(ns, "custom_attributes") as {id: string}[];
                const id = defs.at(-1)?.id ?? "";

                el = (app as {element?: HTMLElement}).element;
                const nameInput = el?.querySelector<HTMLInputElement>(`input[name="defs.${id}.name"]`);
                const hasAll =
                    !!nameInput &&
                    !!el?.querySelector(`input[name="defs.${id}.short"]`) &&
                    !!el?.querySelector(`input[name="defs.${id}.active"]`);
                if (nameInput) {
                    nameInput.value = "SmokeAttr";
                    nameInput.dispatchEvent(new Event("change", {bubbles: true}));
                }
                return {id, hasAll, count: defs.length};
            },
            NS,
        );
        expect(result.hasAll, "new row should render name/abbr/active inputs").toBe(true);
        expect(result.count).toBe(originalDefs.length + 1);

        await expect
            .poll(
                async () =>
                    evalInWorld(
                        page,
                        (p: {ns: string; id: string}) => {
                            const defs = window.game.settings.get(p.ns, "custom_attributes") as StoredAttr[];
                            return defs.find((d) => d.id === p.id)?.name ?? null;
                        },
                        {ns: NS, id: result.id},
                    ),
                {timeout: 8_000, message: "new attribute's name should persist from the menu"},
            )
            .toBe("SmokeAttr");

        // Delete the row: confirmation dialog with an actor-impact count (the
        // attribute isn't in this session's schema, so no actor can hold dice
        // in it yet → 0), then the definition disappears.
        await page.locator(`#${APP_ID} button[data-action="deleteAttribute"][data-id="${result.id}"]`).click();
        const confirm = page.locator("dialog").filter({has: page.locator('button[data-action="yes"]')}).last();
        await expect(confirm, "delete should open a confirmation dialog").toBeVisible();
        await expect(confirm, "dialog should state how many actors hold dice").toContainText("0 actor");
        await confirm.locator('button[data-action="yes"]').click();

        await expect
            .poll(
                async () =>
                    evalInWorld(
                        page,
                        (p: {ns: string; id: string}) => {
                            const defs = window.game.settings.get(p.ns, "custom_attributes") as StoredAttr[];
                            return defs.some((d) => d.id === p.id);
                        },
                        {ns: NS, id: result.id},
                    ),
                {timeout: 8_000, message: "definition should be removed after confirming"},
            )
            .toBe(false);

        // Restore the original definitions and close menus.
        await evalInWorld(
            page,
            async (p: {ns: string; defs: StoredAttr[]}) => {
                await window.game.settings.set(p.ns, "custom_attributes", p.defs);
                for (const a of [...window.foundry.applications.instances.values()]) {
                    const id = (a as {id?: string}).id ?? "";
                    if (id.includes("custom-attributes") || id.includes("customlabels")) {
                        await (a as {close?: () => Promise<unknown>}).close?.();
                    }
                }
            },
            {ns: NS, defs: originalDefs},
        );
    });
});
