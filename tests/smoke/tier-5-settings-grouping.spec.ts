/**
 * Tier 5 — settings grouping / Appearance menu.
 *
 * The system's settings were reorganised so Foundry's settings category (a
 * CategoryBrowser since v13) shows tidy, logically-ordered menu buttons instead
 * of a scatter of loose toggles. The loose display + chat-colour settings were
 * folded into a new Appearance menu. This verifies the outcome on a live world:
 *
 *   - our submenus register in the intended grouped order;
 *   - NO settings under our namespace remain `config: true` (nothing loose in
 *     the main tab — the whole point of the cleanup);
 *   - the Appearance menu opens and persists a change end-to-end.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const NS = "nonex-ist-od6s";
const APP_ID = "nonex-ist-od6s-appearance-configuration";

// The grouped registration order from menus.ts.
const EXPECTED_MENU_ORDER = [
    "custom_labels_menu",
    "custom_fields_menu",
    "active_attributes_menu",
    "attributes_sorting_menu",
    "custom_attributes_menu",
    "character_point_menu",
    "wild_die_menu",
    "deadliness_menu",
    "difficulty_menu",
    "rules_options_menu",
    "misc_menu",
    "initiative_menu",
    "reveal_menu",
    "automation_menu",
    "appearance_menu",
    "maintenance_menu",
];

test.describe.serial("settings grouping", () => {
    test("submenus register in grouped order with no loose settings", async ({page}) => {
        await loginAndWaitReady(page);

        const structure = await evalInWorld(
            page,
            (p: {ns: string}) => {
                const menuOrder = [...window.game.settings.menus.keys()]
                    .filter((k: string) => k.startsWith(`${p.ns}.`))
                    .map((k: string) => k.slice(p.ns.length + 1));

                const loose = [...window.game.settings.settings.values()]
                    .filter((s: {namespace: string; config?: boolean}) => s.namespace === p.ns && s.config === true)
                    .map((s: {key: string}) => s.key);

                return {menuOrder, loose};
            },
            {ns: NS},
        );

        // Menus appear in the intended grouped order.
        expect(structure.menuOrder).toEqual(EXPECTED_MENU_ORDER);
        // Nothing sits loose in the main system tab any more.
        expect(structure.loose).toEqual([]);
    });

    test("the Appearance menu opens and persists a change", async ({page}) => {
        await loginAndWaitReady(page);

        // Open the Appearance app via its registered menu and read a target
        // setting's starting value.
        const before = await evalInWorld(
            page,
            async (p: {ns: string}) => {
                const menu = window.game.settings.menus.get(`${p.ns}.appearance_menu`);
                const app = new menu.type();
                await app.render(true);
                return window.game.settings.get(p.ns, "hide_compendia") as boolean;
            },
            {ns: NS},
        );

        // Toggle the checkbox in the app DOM (submitOnChange persists it).
        const toggled = await evalInWorld(
            page,
            (p: {appId: string}) => {
                const app = [...window.foundry.applications.instances.values()].find(
                    (a: {id?: string}) => a.id === p.appId,
                ) as {element?: HTMLElement} | undefined;
                const box = app?.element?.querySelector<HTMLInputElement>('input[name="hide_compendia"]');
                if (!box) return false;
                box.checked = !box.checked;
                box.dispatchEvent(new Event("change", {bubbles: true}));
                return true;
            },
            {appId: APP_ID},
        );
        expect(toggled, "hide_compendia checkbox found and toggled").toBe(true);

        await expect
            .poll(
                async () =>
                    evalInWorld(
                        page,
                        (p: {ns: string}) => window.game.settings.get(p.ns, "hide_compendia"),
                        {ns: NS},
                    ),
                {timeout: 8_000, message: "hide_compendia should flip after toggling in the Appearance menu"},
            )
            .toBe(!before);
    });

    test("a shared base-class panel (Automation) persists a change", async ({page}) => {
        await loginAndWaitReady(page);

        // Automation is an OD6SSettingsMenu subclass — this exercises the shared
        // base's live-save path that all eight list panels rely on.
        const before = await evalInWorld(page, (ns: string) => window.game.settings.get(ns, "auto_opposed") as boolean, NS);

        const toggled = await evalInWorld(
            page,
            async (ns: string) => {
                const menu = window.game.settings.menus.get(`${ns}.automation_menu`);
                const app = new menu.type();
                await app.render(true);
                const el: HTMLElement | undefined = (app as {element?: HTMLElement}).element;
                const box = el?.querySelector<HTMLInputElement>('input[name="auto_opposed"]');
                if (!box) return false;
                box.checked = !box.checked;
                box.dispatchEvent(new Event("change", {bubbles: true}));
                return true;
            },
            NS,
        );
        expect(toggled, "auto_opposed checkbox found and toggled").toBe(true);

        await expect
            .poll(async () => evalInWorld(page, (ns: string) => window.game.settings.get(ns, "auto_opposed"), NS), {
                timeout: 8_000,
                message: "auto_opposed should persist via the base-class save path",
            })
            .toBe(!before);

        // Restore and close.
        await evalInWorld(
            page,
            async (p: {ns: string; v: boolean}) => {
                await window.game.settings.set(p.ns, "auto_opposed", p.v);
                const app = [...window.foundry.applications.instances.values()].find(
                    (a: {id?: string}) => a.id === "nonex-ist-od6s-automation-configuration",
                ) as {close?: () => Promise<unknown>} | undefined;
                await app?.close?.();
            },
            {ns: NS, v: before},
        );
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
                async (p: {ns: string; appId: string}) => {
                    // Reset the toggled setting and close the app.
                    await window.game.settings.set(p.ns, "hide_compendia", false);
                    const app = [...window.foundry.applications.instances.values()].find(
                        (a: {id?: string; close?: () => Promise<unknown>}) => a.id === p.appId,
                    ) as {close?: () => Promise<unknown>} | undefined;
                    await app?.close?.();
                },
                {ns: NS, appId: APP_ID},
            );
        } finally {
            await context.close();
        }
    });
});
