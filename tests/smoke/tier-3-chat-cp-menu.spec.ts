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

test("CP chat context menu entry is hidden when its gates are not met", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const chatRoot = () => (window.ui.chat?.element ?? document);
        const rowFor = async (id: string): Promise<HTMLElement | null> => {
            for (let i = 0; i < 30; i++) {
                const el = chatRoot().querySelector(`.message[data-message-id="${id}"]`);
                if (el) return el as HTMLElement;
                await new Promise((r) => setTimeout(r, 100));
            }
            return null;
        };
        const rollMessage = (speaker: any, flags: any) =>
            new window.Roll("3d6").evaluate().then((r: any) =>
                r.toMessage({speaker, flags}, {messageMode: "public", create: true}));

        // A character out of character points (checked live by `visible`), and a
        // separate character that still has points for the flag/non-roll cases.
        let broke = window.game.actors.find((a: any) => a.name === "smoke-cp-broke");
        if (!broke) broke = await window.Actor.create({name: "smoke-cp-broke", type: "character"}, {render: false});
        await broke.update({"system.characterpoints.value": 0});

        let rich = window.game.actors.find((a: any) => a.name === "smoke-cp-rich");
        if (!rich) rich = await window.Actor.create({name: "smoke-cp-rich", type: "character"}, {render: false});
        await rich.update({"system.characterpoints.value": 5});

        let vehicle = window.game.actors.find((a: any) => a.name === "smoke-cp-vehicle");
        if (!vehicle) vehicle = await window.Actor.create({name: "smoke-cp-vehicle", type: "vehicle"}, {render: false});

        const cpFlags = (actor: any) => ({"nonex-ist-od6s": {canUseCp: true, actorId: actor.id}});
        // (1) roll flagged canUseCp, but the acting character has 0 points.
        const noCp = await rollMessage(window.ChatMessage.getSpeaker({actor: broke}), cpFlags(broke));
        // (2) roll with points available, but no canUseCp flag.
        const noFlag = await rollMessage(window.ChatMessage.getSpeaker({actor: rich}), {});
        // (3) a non-roll chat card (no `.dice-roll`), flag and points present.
        const plain = await window.ChatMessage.create({
            speaker: window.ChatMessage.getSpeaker({actor: rich}),
            content: "not a roll", flags: cpFlags(rich),
        });
        // (4) roll flagged canUseCp, but the actor is not a character/npc.
        const nonChar = await rollMessage(window.ChatMessage.getSpeaker({actor: vehicle}), cpFlags(vehicle));

        const [liNoCp, liNoFlag, liPlain, liNonChar] = await Promise.all(
            [noCp, noFlag, plain, nonChar].map((m: any) => rowFor(m.id)));

        const options: any[] = [];
        window.Hooks.callAll("getChatMessageContextOptions", window.ui.chat, options);
        const label = window.game.i18n.localize("NONEX_IST_OD6S.USE_A_CHARACTER_POINT");
        const entry = options.find((o: any) => o.label === label);
        const vis = (li: HTMLElement | null) => !!(entry && li && entry.visible(li));

        const out = {
            hasEntry: !!entry,
            rows: [!!liNoCp, !!liNoFlag, !!liPlain, !!liNonChar],
            visibleNoCp: vis(liNoCp),
            visibleNoFlag: vis(liNoFlag),
            visiblePlain: vis(liPlain),
            visibleNonChar: vis(liNonChar),
        };
        await window.ChatMessage.deleteDocuments([noCp.id, noFlag.id, plain.id, nonChar.id]);
        return out;
    });

    expect(result.hasEntry, "entry registered").toBe(true);
    expect(result.rows, "all four message rows rendered").toEqual([true, true, true, true]);
    expect(result.visibleNoCp, "hidden when the character has 0 CP").toBe(false);
    expect(result.visibleNoFlag, "hidden when canUseCp flag is absent").toBe(false);
    expect(result.visiblePlain, "hidden on a non-roll message").toBe(false);
    expect(result.visibleNonChar, "hidden when the actor is not a character/npc").toBe(false);
});
