/**
 * Tier 3g — Melee-range preflight gate end-to-end.
 *
 * Closes the canvas-distance half of the #98 cutover that was only covered
 * by unit tests (`roll-preflight-checks.test.ts`): `passesMeleeRangeGate`
 * reads `actor.getActiveTokens()`, `game.user.targets`, and
 * `canvas.grid.measurePath` — none of which run under vitest.
 *
 * Two cases share the same scene + tokens; only the target token's grid
 * position differs:
 *
 *   - far target  → gate cancels, OD6S.OUT_OF_MELEE_BRAWL_RANGE warn fires,
 *                   no RollDialog opens, no chat message is created.
 *   - same-cell target → gate passes (distance === 0 guard short-circuits),
 *                   RollDialog opens, submit produces a chat message.
 *                   Control case proving the gate is what stops the far-
 *                   target roll, not unrelated breakage. Same-cell rather
 *                   than adjacent so the test doesn't depend on the smoke
 *                   world's `canvas.grid.distance` unit (1 vs 5).
 *
 * The gate only applies when `NONEX_IST_OD6S.meleeRange` is true and the classified
 * subtype is `meleeattack` / `brawlattack`. We toggle the `melee_range`
 * setting for the duration of the spec and restore it after.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

// These cases depend on the PIXI canvas: the gate calls
// `canvas.grid.measurePath` on live token centers. In headless Chromium
// (no hardware acceleration, sub-minimum resolution) that measurement
// transiently returns 0 mid-render, and the gate short-circuits its
// out-of-range warn on `distance === 0` — a re-render race the settle-wait
// in runMeleeRoll narrows but can't fully close from the test side. Bounded
// retries keep these green without masking real logic failures (a genuine
// break fails all attempts). Scoped to this file; global retries stay 0.
// Three retries keep the residual ~30% per-attempt canvas flake well under
// 1% at the suite level.
test.describe.configure({retries: 3});

type GateResult = {
    warned: boolean;
    warnMessage: string | null;
    dialogOpened: boolean;
    chatCreated: boolean;
    errs: string[];
};

async function runMeleeRoll(
    page: import("@playwright/test").Page,
    targetCells: number,
): Promise<GateResult> {
    return await evalInWorld(page, async (args: {targetCells: number}) => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        // Restore-after-each via try/finally — the setting toggle and scene
        // mutations need to unwind cleanly even if a probe throws.
        const prevMeleeRange = window.game.settings.get("nonex-ist-od6s", "melee_range");
        const origWarn = window.ui.notifications.warn.bind(window.ui.notifications);
        let warned = false;
        let warnMessage: string | null = null;
        const expectedWarn = window.game.i18n.localize("NONEX_IST_OD6S.OUT_OF_MELEE_BRAWL_RANGE");
        window.ui.notifications.warn = (msg: string, ...rest: any[]) => {
            if (msg === expectedWarn) {
                warned = true;
                warnMessage = msg;
            }
            return origWarn(msg, ...rest);
        };

        let scene: any = null;
        let actorToken: any = null;
        let targetToken: any = null;
        try {
            await window.game.settings.set("nonex-ist-od6s", "melee_range", true);

            // Character with a strength to roll, melee weapon, and active token.
            let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
            if (!actor) {
                actor = await window.Actor.create(
                    {name: "smoke-character", type: "character"},
                    {render: false},
                );
            }
            if (actor.system.attributes.str.base < 1) {
                await actor.update({"system.attributes.str.base": 9});
            }

            const meleeLabel = window.game.i18n.localize("NONEX_IST_OD6S.MELEE");
            const stale = actor.items.filter(
                (i: any) => i.type === "weapon" && i.name === "smoke-melee-weapon",
            ).map((i: any) => i.id);
            if (stale.length) await actor.deleteEmbeddedDocuments("Item", stale);
            const [weapon] = await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-melee-weapon",
                type: "weapon",
                system: {
                    subtype: meleeLabel,
                    damage: {score: 9, type: "p"},
                    stats: {skill: "Brawling", attribute: "STR"},
                },
            }]);

            // NPC target — distinct actor so we can target a different token.
            let target = window.game.actors.find((a: any) => a.name === "smoke-melee-target");
            if (!target) {
                target = await window.Actor.create(
                    {name: "smoke-melee-target", type: "npc"},
                    {render: false},
                );
            }

            scene = window.game.scenes.find((s: any) => s.name === "test-scene");
            if (!scene) {
                scene = await window.Scene.create({name: "test-scene"});
            }
            await scene.activate();
            // Wait for canvas to finish drawing the active scene — without
            // this, getTokenDocument-then-create can return placeables whose
            // x/y haven't been bound to their documents yet, and
            // canvas.grid.measurePath reads stale 0,0 positions. The first
            // run after a teardown is the failure mode; subsequent runs are
            // fast because the canvas stays warm.
            for (let i = 0; i < 50; i++) {
                if (window.canvas.ready && window.canvas.scene?.id === scene.id) break;
                await new Promise((r) => setTimeout(r, 200));
            }

            const gridSize: number = window.canvas.grid.size;

            // Reset any leftover tokens for these actors from earlier runs.
            const leftover = scene.tokens
                .filter((t: any) => t.actorId === actor.id || t.actorId === target.id)
                .map((t: any) => t.id);
            if (leftover.length) {
                await scene.deleteEmbeddedDocuments("Token", leftover);
            }

            const actorTd = await actor.getTokenDocument({x: gridSize, y: gridSize});
            const targetTd = await target.getTokenDocument({x: args.targetCells * gridSize, y: gridSize});
            const [actorTokenDoc, targetTokenDoc] = await scene.createEmbeddedDocuments(
                "Token",
                [actorTd.toObject(), targetTd.toObject()],
            );

            // Poll for the placeables to bind to their documents — the
            // hooks that create canvas Tokens after createEmbeddedDocuments
            // are async and can lag behind the Promise resolution.
            for (let i = 0; i < 50; i++) {
                actorToken = window.canvas.tokens.get(actorTokenDoc.id);
                targetToken = window.canvas.tokens.get(targetTokenDoc.id);
                if (actorToken?.x === actorTokenDoc.x &&
                    targetToken?.x === targetTokenDoc.x) break;
                await new Promise((r) => setTimeout(r, 100));
            }
            if (!actorToken || !targetToken) {
                throw new Error("placed tokens did not materialize on canvas");
            }

            // Target the far/near token from the current user.
            window.game.user.targets.clear();
            targetToken.setTarget(true, {user: window.game.user, releaseOthers: true});

            // Wait for the exact measurement the range gate depends on to
            // settle. Headless Chromium has no hardware acceleration, so PIXI
            // token centers lag placement and `measurePath` transiently returns
            // 0 mid-render. The gate skips the warn when distance is 0
            // (`if (distance !== 0 && …)`), so rolling before the measured
            // separation is finite and non-zero flakes the out-of-range case.
            let stable = 0;
            for (let i = 0; i < 80; i++) {
                const tgt = [...(window.game.user.targets ?? [])][0];
                const atk = actor.getActiveTokens()[0];
                let d = 0;
                if (tgt?.center && atk?.center) {
                    d = window.canvas.grid.measurePath([atk.center, tgt.center]).distance;
                }
                // Require several consecutive non-zero readings so we roll only
                // once the canvas has stopped re-rendering, not on a single
                // transient non-zero frame.
                stable = Number.isFinite(d) && d > 0 ? stable + 1 : 0;
                if (stable >= 4) break;
                await new Promise((r) => setTimeout(r, 100));
            }

            const apps0 = new Set([...window.foundry.applications.instances.keys()]);
            const msgsBefore = window.game.messages.size;
            await weapon.roll();
            await new Promise((r) => setTimeout(r, 500));

            const dlg = [...window.foundry.applications.instances.values()].find(
                (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
            );
            const dialogOpened = !!dlg;
            let chatCreated = window.game.messages.size > msgsBefore;
            if (dlg) {
                (dlg as any).element.querySelector('[data-action="submit"]')?.click();
                await new Promise((r) => setTimeout(r, 800));
                chatCreated = window.game.messages.size > msgsBefore;
                try { await (dlg as any).close(); } catch { /* ignore */ }
            }

            return {warned, warnMessage, dialogOpened, chatCreated, errs};
        } catch (e) {
            errs.push((e as Error).message);
            return {warned, warnMessage, dialogOpened: false, chatCreated: false, errs};
        } finally {
            window.ui.notifications.warn = origWarn;
            try {
                window.game.user.targets.clear();
            } catch { /* ignore */ }
            try {
                if (scene) {
                    const tokenIds = scene.tokens
                        .filter((t: any) =>
                            t.actor?.name === "smoke-character" ||
                            t.actor?.name === "smoke-melee-target",
                        )
                        .map((t: any) => t.id);
                    if (tokenIds.length) {
                        await scene.deleteEmbeddedDocuments("Token", tokenIds);
                    }
                }
            } catch { /* ignore */ }
            await window.game.settings.set("nonex-ist-od6s", "melee_range", prevMeleeRange);
            window.removeEventListener("unhandledrejection", onRej);
        }
    }, {targetCells});
}

test("melee weapon roll cancels with warn when target is out of range", async ({page}) => {
    await loginAndWaitReady(page);

    // 15 grid cells away — well beyond the 1.5-cell threshold even after
    // the token-size fudge factor for default 1×1 tokens.
    const result = await runMeleeRoll(page, 15);

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.warned, "OUT_OF_MELEE_BRAWL_RANGE warn fired").toBe(true);
    expect(result.dialogOpened, "no roll dialog when gate cancels").toBe(false);
    expect(result.chatCreated, "no chat message when gate cancels").toBe(false);
});

test("melee weapon roll proceeds when target is adjacent", async ({page}) => {
    await loginAndWaitReady(page);

    // Same cell — distance evaluates to 0, which the gate's `distance !== 0`
    // guard short-circuits past the >1.5 threshold check. This decouples
    // the control case from the smoke world's specific grid distance unit
    // (which can vary between 1 and 5 depending on scene defaults).
    const result = await runMeleeRoll(page, 1);

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.warned, "no out-of-range warn for adjacent target").toBe(false);
    expect(result.dialogOpened, "roll dialog opened").toBe(true);
    expect(result.chatCreated, "chat message created").toBe(true);
});
