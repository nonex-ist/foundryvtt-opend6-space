/**
 * Tier 3 — "Use a Character Point" chat context menu (v14 regression).
 *
 * In v14 the entry must register on the `getChatMessageContextOptions` hook and
 * operate on the message row as an HTMLElement. Previously it was bound to a
 * custom hook Foundry never emits (so it never appeared) and its callbacks used
 * jQuery APIs (`li.find`/`li.attr`) that throw on an HTMLElement.
 *
 * Verifies: the entry is registered on the live hook; it is visible for an
 * owned character's roll message while character points remain; and invoking it
 * spends one character point. Creating the message via `roll.toMessage(...,
 * {messageMode})` also exercises the migrated message-mode API end to end.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("CP chat context menu entry appears, is visible, and spends a point", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        // A character with character points to spend.
        let actor = window.game.actors.find((a: any) => a.name === "smoke-cp-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-cp-character", type: "character"}, {render: false});
        }
        await actor.update({"system.characterpoints.value": 5});

        // A roll message flagged canUseCp for this actor (the CP menu's gate),
        // created through the migrated messageMode option.
        const roll = await new window.Roll("3d6").evaluate();
        const message = await roll.toMessage({
            speaker: window.ChatMessage.getSpeaker({actor}),
            flags: {"nonex-ist-od6s": {canUseCp: true, actorId: actor.id}},
        }, {messageMode: "public", create: true});

        // Wait for the message row to render in the chat log.
        const chatRoot = () => (window.ui.chat?.element ?? document);
        let li: HTMLElement | null = null;
        for (let i = 0; i < 30 && !li; i++) {
            li = chatRoot().querySelector(`.message[data-message-id="${message.id}"]`);
            if (!li) await new Promise((r) => setTimeout(r, 100));
        }

        // Fire the v14 hook exactly as Foundry does and locate our entry.
        const options: any[] = [];
        window.Hooks.callAll("getChatMessageContextOptions", window.ui.chat, options);
        const label = window.game.i18n.localize("NONEX_IST_OD6S.USE_A_CHARACTER_POINT");
        const entry = options.find((o: any) => o.label === label);

        const visibleBefore = !!(entry && li && entry.visible(li));
        const cpBefore = actor.system.characterpoints.value;

        // Spend a point. The CP deduction is applied before the (unrelated)
        // message re-render, so guard the call and measure the actor after.
        if (entry && li) {
            try { await entry.onClick(new MouseEvent("click"), li); } catch { /* message rebuild edge */ }
            await new Promise((r) => setTimeout(r, 400));
        }
        const cpAfter = window.game.actors.get(actor.id).system.characterpoints.value;

        return {hasEntry: !!entry, hasRow: !!li, visibleBefore, cpBefore, cpAfter};
    });

    expect(result.hasEntry, "entry registered on getChatMessageContextOptions").toBe(true);
    expect(result.hasRow, "rendered chat message row found").toBe(true);
    expect(result.visibleBefore, "entry visible for owned character with CP").toBe(true);
    expect(result.cpAfter, "one character point spent").toBe(result.cpBefore - 1);
});
