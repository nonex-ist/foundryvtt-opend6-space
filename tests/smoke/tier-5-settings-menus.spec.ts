/**
 * Tier 5 — every settings submenu opens and renders.
 *
 * The list-style config panels (Automation, Rules, Custom Labels, Reveal, …)
 * were consolidated onto one shared base class (settings-menu-base.ts), and the
 * bespoke panels were aligned to the same window classes and Close button. This
 * guards that refactor: it opens EVERY registered submenu, asserts each renders
 * real controls inside the themed settings window, closes cleanly, and that no
 * console errors fire while doing so.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld, expectNoConsoleErrors} from "./helpers/foundry-page.js";

const NS = "nonex-ist-od6s";

test("every settings submenu opens, renders controls, and closes", async ({page}) => {
    await loginAndWaitReady(page);

    const menuKeys = await evalInWorld(
        page,
        (ns: string) =>
            [...window.game.settings.menus.keys()]
                .filter((k: string) => k.startsWith(`${ns}.`))
                .map((k: string) => k.slice(ns.length + 1)),
        NS,
    );
    expect(menuKeys.length).toBeGreaterThanOrEqual(15);

    const results: Array<{key: string; ok: boolean; controls: number; settingsConfig: boolean}> = [];

    await expectNoConsoleErrors(page, async () => {
        for (const key of menuKeys) {
            const r = await evalInWorld(
                page,
                async (p: {ns: string; key: string}) => {
                    const menu = window.game.settings.menus.get(`${p.ns}.${p.key}`);
                    const app = new menu.type();
                    await app.render(true);
                    const el: HTMLElement | undefined = (app as {element?: HTMLElement}).element;
                    const out = {
                        key: p.key,
                        ok: !!el,
                        controls: el ? el.querySelectorAll("input, select, button, li[draggable]").length : 0,
                        settingsConfig: !!el?.classList.contains("settings-config"),
                    };
                    await (app as {close?: () => Promise<unknown>}).close?.();
                    return out;
                },
                {ns: NS, key},
            );
            results.push(r);
        }
    });

    // Every menu rendered inside the themed settings window with real controls.
    const broken = results.filter((r) => !r.ok || r.controls === 0 || !r.settingsConfig);
    expect(broken, `menus that failed to render properly: ${JSON.stringify(broken)}`).toEqual([]);
});
