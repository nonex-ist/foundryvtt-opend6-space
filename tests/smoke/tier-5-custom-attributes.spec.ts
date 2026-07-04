/**
 * Tier 5 — Custom Attributes rework.
 *
 * Custom attributes (CA1–4) used to have their names in Custom Labels and their
 * active toggles in Active Attributes. They now live in one dedicated Custom
 * Attributes menu (name + abbreviation + active per row). This verifies:
 *   - Custom Labels no longer renders any CA inputs;
 *   - the Custom Attributes menu renders name/abbr/active for CA1 and persists a
 *     name edit through the form.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const NS = "nonex-ist-od6s";

test.describe.serial("custom attributes rework", () => {
    test("CA config left Custom Labels and works in its own menu", async ({page}) => {
        await loginAndWaitReady(page);

        // Custom Labels must no longer contain CA inputs.
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

        // Custom Attributes menu renders CA1 name/abbr/active and persists a name.
        const original = await evalInWorld(page, (ns: string) => window.game.settings.get(ns, "customize_ca1_name"), NS);

        const rendered = await evalInWorld(
            page,
            async (ns: string) => {
                const menu = window.game.settings.menus.get(`${ns}.custom_attributes_menu`);
                const app = new menu.type();
                await app.render(true);
                const el: HTMLElement | undefined = (app as {element?: HTMLElement}).element;
                const nameInput = el?.querySelector<HTMLInputElement>('input[name="customize_ca1_name"]');
                const hasAll =
                    !!nameInput &&
                    !!el?.querySelector('input[name="customize_ca1_name_short"]') &&
                    !!el?.querySelector('input[name="customize_ca1_active"]');
                if (nameInput) {
                    nameInput.value = "SmokeAttr";
                    nameInput.dispatchEvent(new Event("change", {bubbles: true}));
                }
                return hasAll;
            },
            NS,
        );
        expect(rendered, "Custom Attributes menu should render CA1 name/abbr/active").toBe(true);

        await expect
            .poll(
                async () => evalInWorld(page, (ns: string) => window.game.settings.get(ns, "customize_ca1_name"), NS),
                {timeout: 8_000, message: "CA1 name should persist from the Custom Attributes menu"},
            )
            .toBe("SmokeAttr");

        // Restore.
        await evalInWorld(
            page,
            async (p: {ns: string; v: string}) => {
                await window.game.settings.set(p.ns, "customize_ca1_name", p.v);
                for (const a of [...window.foundry.applications.instances.values()]) {
                    const id = (a as {id?: string}).id ?? "";
                    if (id.includes("custom-attributes") || id.includes("customlabels")) {
                        await (a as {close?: () => Promise<unknown>}).close?.();
                    }
                }
            },
            {ns: NS, v: original ?? ""},
        );
    });
});
