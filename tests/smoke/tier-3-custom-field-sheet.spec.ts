/**
 * Tier 3 — Custom field header round-trip (#199).
 *
 * Custom fields defined in the `custom_fields` setting must render on the
 * header of every actor type their visibility mask enables, and a value typed
 * into the input must persist into `system.customfields.<id>` via
 * submitOnChange. The vehicle case is a regression check: the legacy fixed
 * slots rendered inputs on vehicle/starship headers with no backing schema
 * field, so entered values were silently dropped.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const NS = "nonex-ist-od6s";
// actorTypes 0b11111 = visible on all five masked actor types.
const FIELD = {id: "cf_smokesheet", name: "SmokeRep", short: "Rep", type: "string", actorTypes: 31};
const ACTOR_TYPES = ["character", "vehicle"] as const;

let originalDefs: unknown = [];

test.describe.serial("Tier 3 — custom field header round-trip (#199)", () => {
    test("field renders on character and vehicle headers and persists", async ({page}) => {
        await loginAndWaitReady(page);

        originalDefs = await evalInWorld(
            page,
            (ns: string) => window.game.settings.get(ns, "custom_fields"),
            NS,
        );
        await evalInWorld(
            page,
            async (p: {ns: string; field: typeof FIELD}) => {
                await window.game.settings.set(p.ns, "custom_fields", [p.field]);
            },
            {ns: NS, field: FIELD},
        );

        for (const type of ACTOR_TYPES) {
            const rendered = await evalInWorld(
                page,
                async (p: {type: string; id: string}) => {
                    const name = `smoke-cf-${p.type}`;
                    const stale = window.game.actors.filter((a: any) => a.name === name).map((a: any) => a.id);
                    if (stale.length) await window.Actor.deleteDocuments(stale);
                    const actor = await window.Actor.create({name, type: p.type}, {render: false});

                    await actor.sheet.render(true);
                    await new Promise((r) => setTimeout(r, 400));

                    const input = actor.sheet.element?.querySelector(
                        `input[name="system.customfields.${p.id}"]`,
                    ) as HTMLInputElement | null;
                    const info = {
                        found: !!input,
                        title: input?.getAttribute("title") ?? "",
                        inForm: input?.closest("form") === actor.sheet.element,
                    };
                    if (input) {
                        input.value = "TestValue";
                        input.dispatchEvent(new Event("change", {bubbles: true}));
                        await new Promise((r) => setTimeout(r, 400));
                    }
                    return info;
                },
                {type, id: FIELD.id},
            );
            expect(rendered.found, `${type} header should render the custom field input`).toBe(true);
            expect(rendered.title, `${type} label uses the abbreviation`).toBe(FIELD.short);
            expect(rendered.inForm, `${type} input submits through the sheet form`).toBe(true);

            await expect
                .poll(
                    async () =>
                        evalInWorld(
                            page,
                            (p: {type: string; id: string}) => {
                                const actor = window.game.actors.find((a: any) => a.name === `smoke-cf-${p.type}`);
                                return actor?.system?.customfields?.[p.id] ?? null;
                            },
                            {type, id: FIELD.id},
                        ),
                    {timeout: 8_000, message: `${type} custom-field value should persist to system.customfields`},
                )
                .toBe("TestValue");
        }
    });

    test.afterAll(async ({browser}) => {
        const context = await browser.newContext({baseURL: process.env.FOUNDRY_URL ?? "http://localhost:30000"});
        const page = await context.newPage();
        try {
            await loginAndWaitReady(page);
            await evalInWorld(
                page,
                async (p: {ns: string; defs: unknown; names: string[]}) => {
                    for (const name of p.names) {
                        const actor = window.game.actors.find((a: any) => a.name === name);
                        await actor?.sheet?.close?.();
                        await actor?.delete();
                    }
                    await window.game.settings.set(p.ns, "custom_fields", p.defs);
                },
                {ns: NS, defs: originalDefs, names: ACTOR_TYPES.map((t) => `smoke-cf-${t}`)},
            );
        } finally {
            await context.close();
        }
    });
});
