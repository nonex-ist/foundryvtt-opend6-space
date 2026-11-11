/**
 * Tier 3 — Active Effect management on items and actors.
 *
 * Regressions covered:
 *
 *   #164 — Adding an effect to a weapon used to throw
 *          `[ActiveEffect] validation errors: ... name: may not be undefined`
 *          because the addEffect helper passed `{label}` instead of `{name}`.
 *
 *   #165 — Existing effects on the character sheet could not be deleted or
 *          toggled. The special-abilities tab rendered effects with no
 *          delete/toggle controls; the data-tab trash button only had its
 *          listener attached when the sheet was in EDIT mode. Deleting an
 *          item that owned an effect on the actor left the effect orphaned.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("item-sheet `+` button creates an ActiveEffect via addEffect helper (#164)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.items.filter((i: any) => i.name === "smoke-effect-weapon")
            .map((i: any) => i.id);
        if (stale.length) await window.Item.deleteDocuments(stale);

        const weapon = await window.Item.create(
            {name: "smoke-effect-weapon", type: "weapon"},
            {render: false},
        );

        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        await weapon.sheet.render(true);
        await new Promise((r) => setTimeout(r, 250));

        // Switch to effects tab if necessary, then click `.effect-add` —
        // this is the click path exercising item-sheet-helpers/effects.ts
        const root = weapon.sheet.element as HTMLElement;
        const effectsTab = root.querySelector('a[data-tab="effects"]') as HTMLElement | null;
        effectsTab?.click();
        await new Promise((r) => setTimeout(r, 100));

        const addBtn = root.querySelector('.effect-add') as HTMLElement | null;
        const hadButton = !!addBtn;
        addBtn?.click();
        await new Promise((r) => setTimeout(r, 400));

        window.removeEventListener("unhandledrejection", onRej);

        const effects = [...weapon.effects.contents];
        const out = {
            errs,
            hadButton,
            count: effects.length,
            firstName: effects[0]?.name ?? null,
        };
        await weapon.sheet.close();
        await weapon.delete();
        return out;
    });

    expect(result.hadButton, ".effect-add button rendered").toBe(true);
    expect(result.errs, "no validation rejections").toEqual([]);
    expect(result.count).toBe(1);
    expect(result.firstName).toBeTruthy();
});

test("actor sheet `.effect-toggle` and `.effect-delete` controls round-trip via the DOM (#165)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-effect-actor")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);
        const actor = await window.Actor.create(
            {name: "smoke-effect-actor", type: "character"},
            {render: false},
        );

        const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
            name: "smoke-effect",
            disabled: false,
        }]);
        const effectId = effect.id;

        // Render the sheet and exercise the toggle/delete via DOM clicks
        // — the regression was these controls being missing on the
        // special-abilities tab and silently no-op on the data tab.
        await actor.sheet.render(true);
        await new Promise((r) => setTimeout(r, 300));
        const root = actor.sheet.element as HTMLElement;

        const toggleBtn = root.querySelector(
            `.effect-toggle[data-effect-id="${effectId}"]`,
        ) as HTMLElement | null;
        const hadToggle = !!toggleBtn;
        toggleBtn?.click();
        // Poll until disabled flips (or timeout) to avoid CI flake.
        const start = Date.now();
        while (actor.effects.get(effectId)?.disabled !== true && Date.now() - start < 2000) {
            await new Promise((r) => setTimeout(r, 50));
        }
        const afterToggle = actor.effects.get(effectId)?.disabled;

        // Re-find the delete button after the toggle re-render
        const deleteBtn = (actor.sheet.element as HTMLElement).querySelector(
            `.effect-delete[data-effect-id="${effectId}"]`,
        ) as HTMLElement | null;
        const hadDelete = !!deleteBtn;
        deleteBtn?.click();
        // Effect delete now asks for confirmation (DialogV2): click "yes" once it appears.
        const start2 = Date.now();
        let confirmed = false;
        while (actor.effects.get(effectId) && Date.now() - start2 < 4000) {
            if (!confirmed) {
                const yes = document.querySelector('dialog button[data-action="yes"]') as HTMLElement | null;
                if (yes) {
                    yes.click();
                    confirmed = true;
                }
            }
            await new Promise((r) => setTimeout(r, 50));
        }
        const afterDelete = actor.effects.get(effectId) ?? null;

        await actor.sheet.close();
        await actor.delete();

        return {hadToggle, hadDelete, afterToggle, afterDelete};
    });

    expect(result.hadToggle, ".effect-toggle rendered").toBe(true);
    expect(result.hadDelete, ".effect-delete rendered").toBe(true);
    expect(result.afterToggle, "toggle flipped disabled").toBe(true);
    expect(result.afterDelete, "delete removed the effect").toBeNull();
});

test("deleting an item also removes orphan actor effects whose origin is the item (#165)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-orphan-actor")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);
        const actor = await window.Actor.create(
            {name: "smoke-orphan-actor", type: "character"},
            {render: false},
        );

        const [item] = await actor.createEmbeddedDocuments("Item", [
            {name: "smoke-orphan-weapon", type: "weapon"},
        ]);

        // Simulate the legacy / drops.ts code-path that copies an effect onto
        // the actor with origin pointing at the source item.
        await actor.createEmbeddedDocuments("ActiveEffect", [{
            name: "smoke-orphan-effect",
            origin: item.uuid,
        }]);
        const beforeDelete = actor.effects.size;

        await item.delete();

        // Poll for the orphan-cleanup hook to settle instead of a fixed sleep
        // so the test stays deterministic under CI load.
        const start = Date.now();
        while (actor.effects.size > 0 && Date.now() - start < 2000) {
            await new Promise((r) => setTimeout(r, 50));
        }
        const afterDelete = actor.effects.size;

        await actor.delete();

        return {beforeDelete, afterDelete};
    });

    expect(result.beforeDelete).toBe(1);
    expect(result.afterDelete).toBe(0);
});
