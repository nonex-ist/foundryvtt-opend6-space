/**
 * Tier 3 — Roll dialog penalty behaviour (regression for #193).
 *
 * Entering a value in a penalty box and then clicking Roll *once* must submit
 * and post a chat message. Previously the penalty `change` event (which fires
 * on blur when the Roll button is pressed) triggered a full dialog re-render
 * that destroyed the submit button mid-click, so the first click was swallowed
 * and a second was required. This must use real pointer events — the
 * programmatic `.click()` used elsewhere can't reproduce the blur→change→click
 * ordering that caused the bug.
 *
 * Also asserts the "resulting dice" preview updates in place on penalty change
 * (the mechanism that replaced the re-render).
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

async function ensureSkillActor(page: import("@playwright/test").Page): Promise<void> {
    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-penalty-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-penalty-character", type: "character"}, {render: false});
        }
        // A rollable linked attribute is required or setupRollData bails and no
        // dialog opens.
        await actor.update({"system.attributes.agi.base": 10});
        // A high skill score guarantees the pool stays positive after a 1D
        // penalty, so the roll always produces a message (an over-penalised
        // roll to 0 dice is suppressed and would mask the regression).
        const skill = actor.items.find((i: any) => i.type === "skill" && i.name === "smoke-penalty-skill");
        if (!skill) {
            await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-penalty-skill", type: "skill", system: {score: 12, attribute: "agi"},
            }]);
        } else {
            await skill.update({"system.score": 12});
        }
    });
}

async function openRollDialog(page: import("@playwright/test").Page): Promise<number> {
    return evalInWorld(page, async () => {
        const actor = window.game.actors.find((a: any) => a.name === "smoke-penalty-character");
        const skill = actor.items.find((i: any) => i.type === "skill" && i.name === "smoke-penalty-skill");
        await skill.roll();
        return window.game.messages.size as number;
    });
}

test("single click submits a roll after entering a penalty (#193)", async ({page}) => {
    await loginAndWaitReady(page);
    await ensureSkillActor(page);
    const before = await openRollDialog(page);

    const dialog = page.locator("#nonex-ist-od6s-roll-dialog");
    await expect(dialog).toBeVisible();

    // Enter an action penalty — the input keeps focus (change has not fired yet).
    await dialog.locator("#actionpenalty").fill("1");

    // One real click on Roll. mousedown blurs the penalty input → `change`
    // fires → (old code re-rendered here and ate the click). The click must
    // still submit.
    await dialog.locator(".dialog-submit").click();

    await expect(dialog, "dialog closes after a single click").toBeHidden();
    const after = await evalInWorld(page, async () => window.game.messages.size as number);
    expect(after, "a single click produced exactly one roll message").toBe(before + 1);
});

test("penalty change updates the resulting-dice preview in place", async ({page}) => {
    await loginAndWaitReady(page);
    await ensureSkillActor(page);
    await openRollDialog(page);

    const dialog = page.locator("#nonex-ist-od6s-roll-dialog");
    await expect(dialog).toBeVisible();

    const preview = dialog.locator(".roll-dice-preview").first();
    const baseline = parseInt(((await preview.textContent()) ?? "0").trim(), 10);

    // Fill then blur (Tab) so the `change` handler runs and patches the preview.
    await dialog.locator("#actionpenalty").fill("1");
    await dialog.locator("#actionpenalty").press("Tab");

    await expect(preview).toHaveText(String(Math.max(0, baseline - 1)));

    // Clean up the open dialog (cancel, not submit).
    await evalInWorld(page, async () => {
        const dlg = [...window.foundry.applications.instances.values()].find(
            (a: any) => a.constructor.name.includes("RollDialog"),
        );
        if (dlg) { try { await (dlg as any).close(); } catch { /* ignore */ } }
    });
});

test("clearing a penalty field still produces a valid roll", async ({page}) => {
    await loginAndWaitReady(page);
    await ensureSkillActor(page);
    const before = await openRollDialog(page);

    const dialog = page.locator("#nonex-ist-od6s-roll-dialog");
    await expect(dialog).toBeVisible();

    // Enter then clear the penalty. A cleared number input reports
    // `valueAsNumber === NaN`; before normalization that NaN flowed into the
    // dice math and broke roll-string generation (no valid message). The
    // handler now coerces it to 0.
    const penalty = dialog.locator("#actionpenalty");
    await penalty.fill("3");
    await penalty.fill("");
    await dialog.locator(".dialog-submit").click();

    await expect(dialog, "dialog closes on submit").toBeHidden();
    const info = await evalInWorld(page, async () => {
        const msgs = [...window.game.messages.values()];
        const total = (msgs[msgs.length - 1] as any)?.rolls?.[0]?.total;
        return {count: window.game.messages.size as number, isFinite: Number.isFinite(total)};
    });
    expect(info.count, "a roll message was created").toBe(before + 1);
    expect(info.isFinite, "roll total is finite (cleared penalty coerced to 0)").toBe(true);
});
