/**
 * Tier 3 — sheet mode notice and read-only sheets.
 *
 * Regressions covered:
 *
 *   - The "sheet is in <mode> mode — rolling is disabled" notice must render
 *     outside Normal mode, with its text resolved, WITHOUT adding a row to
 *     the sheet footer. A first version sat on its own line, shrank
 *     `.sheet-body`, and pushed tab content out of view.
 *
 *   - A sheet the viewer cannot edit gets the `locked` root class and hides
 *     its add/delete/advance controls (their listeners are not bound, so a
 *     visible control would be a dead button). Exercised without a second
 *     login by opening the actor from a locked throwaway compendium, which
 *     is non-editable even for a GM.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("sheet-mode notice shows outside Normal mode without growing the footer", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-sheet-mode")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);

        const actor = await window.Actor.create(
            {name: "smoke-sheet-mode", type: "character"},
            {render: false},
        );

        const measure = async () => {
            await actor.sheet.render(true);
            await new Promise((r) => setTimeout(r, 350));
            const root = actor.sheet.element as HTMLElement;
            const footer = root.querySelector("section.sheet-mode") as HTMLElement | null;
            const notice = root.querySelector(".sheet-mode-banner") as HTMLElement | null;
            const noticeRect = notice?.getBoundingClientRect();
            return {
                footerHeight: footer?.getBoundingClientRect().height ?? 0,
                hasNotice: !!notice,
                noticeVisible: !!noticeRect && noticeRect.width > 0 && noticeRect.height > 0,
                noticeText: notice?.textContent?.trim() ?? "",
            };
        };

        const normal = await measure();
        await actor.update({"system.sheetmode.value": "freeedit"});
        const freeEdit = await measure();
        await actor.update({"system.sheetmode.value": "advance"});
        const advance = await measure();

        const labels = {
            freeEdit: window.game.i18n.localize("NONEX_IST_OD6S.SHEETMODE_FREEDIT"),
            advance: window.game.i18n.localize("NONEX_IST_OD6S.SHEETMODE_ADVANCE"),
        };

        await actor.sheet.close();
        await actor.delete();
        return {normal, freeEdit, advance, labels};
    });

    expect(result.normal.hasNotice, "no notice in Normal mode").toBe(false);

    for (const [mode, label] of [["freeEdit", result.labels.freeEdit], ["advance", result.labels.advance]] as const) {
        const m = result[mode];
        expect(m.hasNotice, `${mode}: notice rendered`).toBe(true);
        expect(m.noticeVisible, `${mode}: notice has a visible box`).toBe(true);
        expect(m.noticeText, `${mode}: notice names the mode`).toContain(label);
        expect(m.noticeText, `${mode}: placeholder was substituted`).not.toContain("{mode}");
        expect(m.noticeText, `${mode}: key was localized`).not.toContain("NONEX_IST_OD6S");
        // Inline with the selector: the footer must not gain a row. (Body
        // height is not compared: other modes add their own header rows.)
        expect(m.footerHeight - result.normal.footerHeight, `${mode}: footer did not grow`).toBeLessThan(6);
    }
});

test("non-editable sheet is marked locked and hides mutating controls", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const CONTROLS = ".item-add, .item-delete, .spec-delete, .advanceup, .advancedown";
        const probe = (root: HTMLElement) => {
            const controls = [...root.querySelectorAll(CONTROLS)] as HTMLElement[];
            return {
                locked: !!root.querySelector(".locked") || root.classList.contains("locked"),
                total: controls.length,
                shown: controls.filter((c) => getComputedStyle(c).display !== "none").length,
            };
        };

        // World character with an item, so add/delete controls exist.
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-sheet-access")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);
        const world = await window.Actor.create(
            {name: "smoke-sheet-access", type: "character"},
            {render: false},
        );
        await world.createEmbeddedDocuments("Item", [{name: "smoke-gear", type: "gear"}]);
        (world.sheet.tabGroups ??= {}).primary = "inventory";
        await world.sheet.render(true);
        await new Promise((r) => setTimeout(r, 400));
        const editable = {
            isEditable: world.sheet.isEditable,
            ...probe(world.sheet.element as HTMLElement),
        };
        await world.sheet.close();

        // Same actor inside a locked compendium → sheet.isEditable is false
        // even for a GM. A throwaway world pack keeps this self-contained.
        const PACK_ID = "world.smoke-sheet-access";
        await window.game.packs.get(PACK_ID)?.deleteCompendium();
        const pack = await window.foundry.documents.collections.CompendiumCollection.createCompendium(
            {label: "smoke-sheet-access", name: "smoke-sheet-access", type: "Actor"},
        );
        let readOnly;
        try {
            const doc = await pack.importDocument(world);
            await pack.configure({locked: true});
            (doc.sheet.tabGroups ??= {}).primary = "inventory";
            await doc.sheet.render(true);
            await new Promise((r) => setTimeout(r, 400));
            readOnly = {
                packLocked: pack.locked,
                isEditable: doc.sheet.isEditable,
                ...probe(doc.sheet.element as HTMLElement),
            };
            await doc.sheet.close();
        } finally {
            await pack.configure({locked: false});
            await pack.deleteCompendium();
            await world.delete();
        }

        return {readOnly, editable};
    });

    expect(result.readOnly.packLocked, "precondition: pack is locked").toBe(true);
    expect(result.readOnly.isEditable, "precondition: compendium sheet is not editable").toBe(false);
    expect(result.readOnly.locked, "read-only sheet carries the locked class").toBe(true);
    expect(result.readOnly.total, "read-only sheet still renders the controls in the DOM").toBeGreaterThan(0);
    expect(result.readOnly.shown, "no mutating control is visible on a read-only sheet").toBe(0);

    expect(result.editable.isEditable, "world copy is editable").toBe(true);
    expect(result.editable.locked, "editable sheet is not marked locked").toBe(false);
    expect(result.editable.shown, "editable sheet shows its mutating controls").toBeGreaterThan(0);
});
