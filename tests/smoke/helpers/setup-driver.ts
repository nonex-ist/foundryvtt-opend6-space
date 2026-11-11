/**
 * Foundry setup-flow driver.
 *
 * State machine over the four pages Foundry can land on when Playwright
 * navigates to "/":
 *
 *   /auth   — admin password gate. Submit FOUNDRY_ADMIN_KEY (or empty).
 *   /setup  — world manager. Either launch our smoke world if it exists,
 *             or create + launch one if it doesn't.
 *   /join   — world is launched, awaiting a user pick. Caller takes over.
 *   /game   — world is launched and a session is open. Caller takes over.
 *
 * Idempotent: cheap when the smoke world is already launched, ~5–10 s when
 * it has to provision from scratch.
 *
 * Safety: refuses to launch or interact with a different world than the
 * one we expect. A developer running their personal campaign on the same
 * Foundry instance will see a clear error rather than have their world
 * trampled.
 *
 * Tested against Foundry v14. The DOM selectors live here intentionally
 * — when Foundry redesigns the setup UI on a major version bump, the
 * fix is one file. See SELECTORS below.
 */

import {Page} from "@playwright/test";

/**
 * Selectors for the setup screens. Update these in one place when a
 * Foundry version bump moves things around. The shape of these queries
 * is intentionally forgiving (multiple `, ` alternates) so a class or
 * attribute rename in Foundry doesn't immediately break the suite.
 */
const SELECTORS = {
    auth: {
        passwordInput: 'input[name="adminKey"], input[type="password"]',
        submit: 'button[type="submit"], button[name="adminKey"]',
    },
    setup: {
        // Tile / row representing a world. v14 uses data-package-id; older
        // releases used data-world-id. Accept both.
        worldTile: (id: string) =>
            `li.package.world[data-package-id="${id}"], [data-world-id="${id}"]`,
        worldLaunch: 'a[data-action="worldLaunch"], button[data-action="worldLaunch"]',
        // "Create World" entry in the worlds tab toolbar
        createWorldButton: 'button[data-action="worldCreate"]',
        // The create-world dialog (form#world-create on v14)
        worldForm: 'form#world-create',
        worldIdInput: 'form#world-create input[name="world-id"]',
        worldTitleInput: 'form#world-create input[name="title"]',
        worldSystemSelect: 'form#world-create select[name="system"]',
        worldFormSubmit: 'form#world-create button[type="submit"]',
        // "Install Dependency Automatically" in the package-dependency
        // DialogV2 WorldCreate opens when a required module is missing.
        dependencyAutoInstall: 'dialog button[data-action="automatic"]',
    },
};

export interface EnsureWorldOptions {
    /** World id (folder name) we expect — defaults to FOUNDRY_SMOKE_WORLD or `nonex-ist-od6s-smoke`. */
    worldId: string;
    /** System id to use when creating the world from scratch. */
    system: string;
    /**
     * Foundry server admin key (`FOUNDRY_ADMIN_KEY`); empty if Foundry
     * runs without one. Same convention as the project's `.env.example`
     * and the `task foundry:start` Taskfile recipe.
     */
    adminKey?: string;
    /**
     * GM user name for joining a running world to inspect its id.
     * Only used when we need to detect a mismatched world before
     * shutting it down.
     */
    gmUser?: string;
    /** GM join password (FOUNDRY_GM_PASSWORD). Empty for password-less GM. */
    gmPassword?: string;
    /**
     * If a different world is running, return it to /setup and launch
     * the expected world instead. Default true. Set to false to fail
     * loud when the world is mismatched (preserves an in-progress
     * non-smoke session).
     */
    autoShutdown?: boolean;
    /** Logging hook for orchestration trace. */
    log?: (msg: string) => void;
}

/**
 * Drive Foundry from wherever it is now to "world launched, ready for
 * loginAndWaitReady". Throws with an actionable message on every
 * failure mode the developer can fix.
 */
export async function ensureWorldLaunched(
    page: Page,
    opts: EnsureWorldOptions,
): Promise<void> {
    const log = opts.log ?? (() => {});
    const adminKey = opts.adminKey ?? "";
    if (!adminKey) {
        log(
            `[setup-driver] FOUNDRY_ADMIN_KEY is empty — will only succeed if ` +
            `Foundry has no admin password configured.`,
        );
    }

    // Surface page-side failures. The setup screens report problems via
    // console errors and ui.notifications, neither of which reaches the
    // Playwright log otherwise — a failed world creation is silent.
    page.on("console", (m) => {
        if (m.type() === "error") log(`[setup-driver] console.error: ${m.text()}`);
    });
    page.on("pageerror", (e) => log(`[setup-driver] pageerror: ${e.message}`));

    // Cap iterations so a misbehaving Foundry can't spin us forever.
    const MAX_HOPS = 6;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
        // `networkidle`, not `domcontentloaded` — Foundry's setup pages
        // render forms via JS into <template> elements after the initial
        // HTML lands, so domcontentloaded is too early.
        await page.goto("/", {waitUntil: "networkidle"});
        const url = page.url();
        log(`[setup-driver] hop ${hop}: ${url}`);
        await snapshot(page, `hop-${hop}`, log);

        if (url.includes("/auth")) {
            await driveAuth(page, adminKey);
            continue;
        }

        if (url.includes("/setup")) {
            await driveSetup(page, opts);
            continue;
        }

        if (url.includes("/join") || url.includes("/game")) {
            // A world is up. Confirm it's *our* world; if not, optionally
            // shut it down and re-enter the loop so /setup launches the
            // right one. Without this check the running world would only
            // be detected per-spec by loginAndWaitReady's identity guard,
            // by which point globalSetup has already returned success.
            const runningId = await detectRunningWorldId(page, opts);
            if (runningId === opts.worldId) {
                log(`[setup-driver] world '${opts.worldId}' already launched`);
                return;
            }
            if (runningId === null) {
                // Could not determine the world id (e.g., login failed).
                // Hand back to the caller — loginAndWaitReady will surface
                // the underlying error with better context than we can.
                log(`[setup-driver] world launched but id undetectable; deferring to caller`);
                return;
            }
            const autoShutdown = opts.autoShutdown ?? true;
            if (!autoShutdown) {
                throw new Error(
                    `[setup-driver] world '${runningId}' running but expected '${opts.worldId}'.\n` +
                    `  → Stop the running world or set FOUNDRY_SMOKE_AUTOSHUTDOWN=1.`,
                );
            }
            log(`[setup-driver] world '${runningId}' running; shutting down to launch '${opts.worldId}'`);
            await shutdownRunningWorld(page, opts);
            continue;
        }

        throw new Error(
            `[setup-driver] unexpected page ${url} (no /auth, /setup, /join, or /game)`,
        );
    }
    throw new Error(`[setup-driver] gave up after ${MAX_HOPS} hops`);
}

async function driveAuth(page: Page, adminKey: string): Promise<void> {
    const input = page.locator(SELECTORS.auth.passwordInput).first();
    try {
        await input.waitFor({state: "visible", timeout: 10_000});
    } catch {
        throw new Error(
            `[setup-driver] /auth page password input never rendered — selector drift?`,
        );
    }
    await input.fill(adminKey);
    await page.locator(SELECTORS.auth.submit).first().click();
    await page.waitForLoadState("networkidle");

    // Detect auth failure: Foundry stays on /auth and posts a notification.
    if (page.url().includes("/auth")) {
        const notif = await page
            .locator("#notifications .notification.error")
            .allTextContents()
            .catch(() => [] as string[]);
        const msg = notif.find((n) => /administrator password/i.test(n)) ?? notif[0];
        throw new Error(
            `[setup-driver] admin auth failed: ${msg ?? "(no notification text)"}\n` +
            `  → Set FOUNDRY_ADMIN_KEY to your Foundry server admin password.`,
        );
    }
}

async function driveSetup(page: Page, opts: EnsureWorldOptions): Promise<void> {
    // /setup renders its tabs and tiles after JS init. Wait for *something*
    // interactive to appear before deciding present-or-absent.
    await page.locator("button, [data-package-id]").first()
        .waitFor({state: "visible", timeout: 10_000})
        .catch(() => undefined);

    // Foundry shows onboarding tours over /setup on a fresh install (and
    // sometimes after upgrades). Their `tour-overlay` div intercepts
    // pointer events, so anything we click silently times out behind it.
    // Dismiss any tour we can see, in a loop — Foundry can chain them.
    await dismissTours(page);

    // Look for our world's tile. If present, launch it. If not, create.
    const tile = page.locator(SELECTORS.setup.worldTile(opts.worldId)).first();
    if (await tile.count()) {
        // Foundry v14 renders `.control.play` with `visibility: hidden` —
        // the buttons only un-hide on hover, and Playwright's actionability
        // check rejects clicks on hidden elements (hover/force don't help).
        // Dispatch the click via the DOM so it still flows through Foundry's
        // delegated `data-action="worldLaunch"` handler, which is what
        // actually invokes SetupApplication#launchWorld(pkg).
        const launchSelector = SELECTORS.setup.worldLaunch;
        const dispatched = await page.evaluate(
            ({worldId, selector}) => {
                const t = document.querySelector(
                    `li.package.world[data-package-id="${worldId}"], [data-world-id="${worldId}"]`,
                );
                if (!t) return "no-tile";
                const btn = t.querySelector(selector) as HTMLElement | null;
                if (!btn) return "no-button";
                btn.click();
                return "clicked";
            },
            {worldId: opts.worldId, selector: launchSelector},
        );
        if (dispatched !== "clicked") {
            throw new Error(
                `[setup-driver] could not dispatch worldLaunch for "${opts.worldId}": ${dispatched}`,
            );
        }

        // SetupApplication#launchWorld opens a DialogV2 migration prompt
        // when the world's coreVersion or systemVersion lags Foundry's.
        // Confirm it. If the world is up-to-date, the dialog never
        // appears and waitForURL fires first.
        await Promise.race([
            confirmMigrationIfShown(page),
            page.waitForURL(/\/(join|game)\b/, {timeout: 60_000}).catch(() => undefined),
        ]);
        // Either path eventually navigates away from /setup; wait for it.
        await page.waitForURL(/\/(join|game)\b/, {timeout: 60_000});
        return;
    }

    await createWorld(page, opts);
}

/**
 * After a worldLaunch click, Foundry may open a DialogV2 confirmation
 * prompt (`SETUP.WorldMigrationRequiredTitle`) if the world's
 * coreVersion or systemVersion lags Foundry's. Click "Yes" so the
 * launch can proceed. No-op when the dialog never appears (world is
 * already current); resolves once the dialog is gone or after a short
 * timeout — the caller wraps this in a Promise.race against the
 * happy-path navigation, so a missing dialog is fine.
 */
async function confirmMigrationIfShown(page: Page): Promise<void> {
    // DialogV2 in v14 renders as `<dialog class="dialog ...">` with a
    // `.form-footer` containing the yes/no buttons. The "yes" button has
    // `data-action="yes"`. Wait briefly for it to appear.
    const yesBtn = page.locator(
        'dialog.dialog button[data-action="yes"], dialog button[data-action="yes"]',
    ).first();
    try {
        await yesBtn.waitFor({state: "visible", timeout: 5_000});
    } catch {
        return; // no dialog — happy path
    }
    // The migration prompt has a "Create a backup before migrating?"
    // checkbox that defaults to checked. The backup step can take
    // minutes on a populated world and easily blows past our launch
    // wait. A smoke world has no data worth preserving (we recreate
    // it on demand), so uncheck it to keep the launch fast.
    await page.evaluate(() => {
        const cb = document.querySelector(
            'dialog input[name="createBackup"]',
        ) as HTMLInputElement | null;
        if (cb) cb.checked = false;
    });
    await yesBtn.click({force: true});
}

async function dismissTours(page: Page): Promise<void> {
    for (let i = 0; i < 5; i++) {
        const exit = page.locator('aside.tour a.step-button[data-action="exit"]').first();
        if (!(await exit.count())) return;
        await exit.click({timeout: 3_000}).catch(() => undefined);
        await page.waitForTimeout(200);
    }
}

async function createWorld(page: Page, opts: EnsureWorldOptions): Promise<void> {
    const createBtn = page.locator(SELECTORS.setup.createWorldButton).first();
    if (!(await createBtn.count())) {
        throw new Error(
            `[setup-driver] cannot find "Create World" control on /setup. ` +
            `Either Foundry's UI moved (update SELECTORS in setup-driver.ts) ` +
            `or you're on a screen where world creation is disabled.`,
        );
    }
    await createBtn.click();

    // The create-world form usually opens in a dialog/sheet. Fields appear
    // in the same DOM (Foundry doesn't iframe its dialogs).
    await page.locator(SELECTORS.setup.worldIdInput).first().waitFor({timeout: 10_000});

    await page.locator(SELECTORS.setup.worldIdInput).first().fill(opts.worldId);
    await page.locator(SELECTORS.setup.worldTitleInput).first().fill(opts.worldId);

    const systemSelect = page.locator(SELECTORS.setup.worldSystemSelect).first();
    // Two value formats Foundry has used: bare id ("nonex-ist-od6s") or package id
    // ("nonex-ist-od6s.od6s"). Try the bare id first; fall back to label match.
    try {
        await systemSelect.selectOption({value: opts.system});
    } catch {
        await systemSelect.selectOption({label: opts.system});
    }

    await snapshot(page, "create-world-filled", opts.log);
    await page.locator(SELECTORS.setup.worldFormSubmit).first().click();

    // On a fresh data dir the system's required module (socketlib) isn't
    // installed yet, so WorldCreate opens an "Install Package Dependencies"
    // DialogV2 and blocks creation until it's answered. Accept the automatic
    // install when it shows up; if it doesn't within a few seconds, the
    // dependencies are already present.
    const autoInstall = page.locator(SELECTORS.setup.dependencyAutoInstall).first();
    const prompted = await autoInstall.waitFor({state: "visible", timeout: 8_000})
        .then(() => true, () => false);
    if (prompted) {
        opts.log?.(`[setup-driver] installing missing package dependencies`);
        await autoInstall.click();
    }

    // WorldCreate submits with `launch: true` and navigates off /setup once
    // the world exists (dependency download + creation can take a while).
    // If it doesn't, fall through: the next loop hop finds the new tile.
    await page.waitForURL((u) => !u.pathname.startsWith("/setup"), {timeout: 120_000})
        .catch(() => undefined);
    await snapshot(page, "create-world-submitted", opts.log);
}

/**
 * Save a full-page screenshot under test-results/setup-driver/ and log any
 * visible Foundry notifications. Diagnostics only — never throws.
 */
async function snapshot(page: Page, name: string, log?: (msg: string) => void): Promise<void> {
    try {
        await page.screenshot({path: `test-results/setup-driver/${name}.png`, fullPage: true});
        const notes = await page.locator("#notifications li, .notification")
            .evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()).filter(Boolean));
        if (notes.length) log?.(`[setup-driver] notifications @${name}: ${notes.join(" | ")}`);
    } catch {
        // Page may be mid-navigation; diagnostics are best-effort.
    }
}

/**
 * Resolve the id of the world Foundry is currently serving.
 *
 * Foundry exposes `game.world.id` on the /join page itself — no login
 * required. From /game the same global is authoritative. Returns null
 * if the global isn't populated (caller defers to per-spec
 * `loginAndWaitReady` for a clearer error).
 */
async function detectRunningWorldId(
    page: Page,
    _opts: EnsureWorldOptions,
): Promise<string | null> {
    try {
        await page.waitForFunction(() => (window as any).game?.world?.id, null, {timeout: 15_000});
        return await page.evaluate(() => (window as any).game?.world?.id ?? null);
    } catch {
        return null;
    }
}

/**
 * Return the running world to /setup so the loop can re-launch the
 * expected one.
 *
 * From /join: submit the "Return to Setup" admin form (`#join-game-setup`)
 * with `FOUNDRY_ADMIN_KEY`. This is the path Foundry's UI uses, and
 * unlike `game.shutDown()` it doesn't require the browser to hold a
 * Gamemaster session — only the server admin key.
 *
 * From /game: fall back to `game.shutDown()`, which requires the
 * logged-in user to be a Gamemaster. If they aren't, this throws and
 * surfaces the underlying Foundry message.
 */
async function shutdownRunningWorld(page: Page, opts: EnsureWorldOptions): Promise<void> {
    const url = page.url();
    if (url.includes("/join")) {
        const adminKey = opts.adminKey ?? "";
        const form = page.locator("#join-game-setup");
        await form.locator('input[name="adminPassword"]').fill(adminKey);
        await form.locator('button[type="submit"]').click();
    } else {
        await page.evaluate(() => (window as any).game?.shutDown?.());
    }
    // The redirect target is /setup on success, /auth if the admin key
    // was rejected. Either is fine for the hop loop.
    await page.waitForURL((u) => /\/(setup|auth)\b/.test(u.pathname), {timeout: 30_000});
}
