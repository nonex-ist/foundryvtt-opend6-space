/**
 * Foundry-specific Playwright helpers.
 *
 * Connects to a running Foundry world (launched separately by the developer
 * or CI), logs in as the configured user, and waits for `game.ready`. The
 * smoke specs then call `evalInWorld()` to run their probes inside the
 * browser context — the same scripts that ship in docs/test-runbook.md.
 *
 * Configuration via env:
 *   FOUNDRY_URL          (default http://localhost:30000)
 *   FOUNDRY_USER         (default "Gamemaster")
 *   FOUNDRY_GM_PASSWORD  (default "" — fresh smoke worlds have no GM password)
 *   FOUNDRY_SMOKE_WORLD  (default "nonex-ist-od6s-smoke" — the world id this harness
 *                        is allowed to interact with; identity-guarded to
 *                        avoid trampling a developer's personal campaign on
 *                        the same Foundry instance)
 *
 * Note: `FOUNDRY_PASSWORD` is *not* read here — it's the foundryvtt.com
 * website password used by `task foundry:start` for license activation,
 * and is intentionally distinct from the per-user join password.
 */

import {Page, expect} from "@playwright/test";

const USER = process.env.FOUNDRY_USER ?? "Gamemaster";
// `FOUNDRY_GM_PASSWORD` is the per-user join password for the smoke
// world's Gamemaster — separate from `FOUNDRY_PASSWORD` (the
// foundryvtt.com website password used by `task foundry:start` for
// license activation) and `FOUNDRY_ADMIN_KEY` (the server admin password
// used to enter /setup). A fresh smoke world's GM has no password, so
// the default of empty is correct.
const PASSWORD = process.env.FOUNDRY_GM_PASSWORD ?? "";
const SMOKE_WORLD = process.env.FOUNDRY_SMOKE_WORLD ?? "nonex-ist-od6s-smoke";

declare global {
    interface Window {
        game: any;
        ui: any;
        CONFIG: any;
        Actor: any;
        Item: any;
        Combat: any;
        Scene: any;
        ChatMessage: any;
        Hooks: any;
        Roll: any;
        foundry: any;
    }
}

/**
 * Navigate to the Foundry join page, pick the configured user, and wait
 * for `game.ready === true`. Idempotent: if the world is already loaded
 * (the page reports `game.ready`), this short-circuits.
 */
export async function loginAndWaitReady(page: Page): Promise<void> {
    // Use `networkidle`, not `domcontentloaded` — Foundry's join page
    // populates the user dropdown via JS after initial HTML lands.
    // selectOption against an unpopulated <select> silently picks the
    // empty default option, which Foundry then rejects.
    await page.goto("/", {waitUntil: "networkidle"});

    const url = page.url();
    if (url.includes("/join")) {
        // user-select page. Scope all selectors to #join-game-form — the
        // page also contains a "Return to Setup" form whose submit button
        // would otherwise match.
        const form = page.locator('#join-game-form');
        // 14.370 renamed the user select `userid` → `userId`; accept both so
        // the suite still runs against older v14 builds.
        const userSelect = form.locator('select[name="userId"], select[name="userid"]').first();
        await userSelect.waitFor({state: "visible"});
        await userSelect.selectOption({label: USER});
        await form.locator('input[name="password"]').fill(PASSWORD);
        await form.locator('button[type="submit"]').click();
        // Foundry's join form is a GET to /join — confirm we navigated
        // away. If we didn't, the password was wrong; surface the error
        // with the notification text instead of a 30 s game.ready timeout.
        await page.waitForURL((u) => !u.pathname.startsWith("/join"), {timeout: 10_000})
            .catch(async () => {
                const notif = await page.locator("#notifications .notification").allTextContents();
                throw new Error(
                    `[smoke] /join submit did not navigate away. URL=${page.url()}, notifications=${JSON.stringify(notif)}\n` +
                    `  → If the GM has a password, set FOUNDRY_GM_PASSWORD.`,
                );
            });
    }

    // Wait for game.ready in the page context
    await page.waitForFunction(() => (window as any).game?.ready === true, null, {
        timeout: 30_000,
    });

    // Identity guard — refuse to run specs against an unexpected world.
    // Catches: developer ran a single spec without globalSetup, world id
    // changed but a spec wasn't updated, manual Foundry session left
    // pointed at the wrong world.
    const worldId = await page.evaluate(() => (window as any).game?.world?.id);
    if (worldId !== SMOKE_WORLD) {
        throw new Error(
            `[smoke] running against world '${worldId}' but expected '${SMOKE_WORLD}'.\n` +
            `  → Set FOUNDRY_SMOKE_WORLD or launch the correct world via globalSetup.`,
        );
    }
}

/**
 * Run an arbitrary async function inside the world's page context. The
 * function and arg must be JSON-serializable; the result must be too.
 * Errors thrown inside propagate out to the test.
 *
 * Use this to run the same probe scripts the test runbook documents.
 */
export async function evalInWorld<T>(
    page: Page,
    fn: () => Promise<T> | T,
): Promise<T>;
export async function evalInWorld<T, A>(
    page: Page,
    fn: (arg: A) => Promise<T> | T,
    arg: A,
): Promise<T>;
export async function evalInWorld<T, A>(
    page: Page,
    fn: ((arg: A) => Promise<T> | T) | (() => Promise<T> | T),
    arg?: A,
): Promise<T> {
    if (arguments.length >= 3) {
        return await page.evaluate(fn as (arg: A) => Promise<T> | T, arg as A);
    }
    return await page.evaluate(fn as () => Promise<T> | T);
}

/**
 * Assert there are no unexpected console errors during the bracketed
 * action. Use to gate sensitive flows where errors are silent.
 */
export async function expectNoConsoleErrors(
    page: Page,
    action: () => Promise<void>,
): Promise<void> {
    const errors: string[] = [];
    const onError = (msg: import("@playwright/test").ConsoleMessage) => {
        if (msg.type() === "error") errors.push(msg.text());
    };
    page.on("console", onError);
    try {
        await action();
    } finally {
        page.off("console", onError);
    }
    expect(errors, "console errors during action").toEqual([]);
}

/**
 * Minimal dotted-version compare for spec assertions running in Node
 * (mirrors `foundry.utils.isNewerVersion` for plain x.y.z strings).
 * Lets migration specs assert "version advanced past the step under test"
 * instead of pinning the suite-wide terminal migration version, which moves
 * with every new migration step.
 */
export function isNewerVersion(a: string, b: string): boolean {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d !== 0) return d > 0;
    }
    return false;
}
