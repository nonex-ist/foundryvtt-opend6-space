/**
 * Pure domain logic for the dynamic custom-field and custom-attribute slots
 * (#199). Definitions live in two world settings — `custom_fields` and
 * `custom_attributes` — each holding an array of slot objects with a stable
 * `id`. Actor data is keyed by that id: header-field values under
 * `system.customfields.<id>`, attribute scores under
 * `system.attributes.<id>` (custom attributes become real schema fields,
 * built from the setting at init).
 *
 * Everything here is pure (no Foundry globals) so it is unit-testable; the
 * runtime glue that reads `game.settings` lives in
 * `config/settings/custom-slots.ts`.
 */

/** One world-defined header field (name/short/type + actor-type visibility bitmask). */
export interface CustomFieldDef {
    id: string;
    name: string;
    short: string;
    type: "string" | "number";
    /** Bitmask over `OD6S.actorMasks` controlling which actor types show the field. */
    actorTypes: number;
}

/** One world-defined rollable attribute. */
export interface CustomAttributeDef {
    id: string;
    name: string;
    short: string;
    active: boolean;
}

/** Ids migrated from the legacy fixed slots keep their historic numbering. */
export const LEGACY_FIELD_ID_PREFIX = "cf";
export const LEGACY_ATTRIBUTE_ID_PREFIX = "ca";

const ID_PATTERN = /^[a-z][a-z0-9_]*$/;

function asString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

/**
 * Validate/clean a stored `custom_fields` setting value. Entries without a
 * usable id are dropped; missing properties get safe defaults so a partially
 * written setting never breaks schema construction or rendering.
 */
export function normalizeCustomFieldDefs(raw: unknown): CustomFieldDef[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const defs: CustomFieldDef[] = [];
    for (const entry of raw) {
        if (typeof entry !== "object" || entry === null) continue;
        const e = entry as Record<string, unknown>;
        const id = asString(e.id);
        if (!ID_PATTERN.test(id) || seen.has(id)) continue;
        seen.add(id);
        defs.push({
            id,
            name: asString(e.name),
            short: asString(e.short),
            type: e.type === "number" ? "number" : "string",
            actorTypes: Number(e.actorTypes) || 0,
        });
    }
    return defs;
}

/** Validate/clean a stored `custom_attributes` setting value. */
export function normalizeCustomAttributeDefs(raw: unknown): CustomAttributeDef[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const defs: CustomAttributeDef[] = [];
    for (const entry of raw) {
        if (typeof entry !== "object" || entry === null) continue;
        const e = entry as Record<string, unknown>;
        const id = asString(e.id);
        if (!ID_PATTERN.test(id) || seen.has(id)) continue;
        seen.add(id);
        defs.push({
            id,
            name: asString(e.name),
            short: asString(e.short),
            active: e.active === true,
        });
    }
    return defs;
}

/**
 * Fields visible on a given actor type: named, and with the actor type's bit
 * set in the visibility mask.
 */
export function visibleCustomFields(
    defs: CustomFieldDef[],
    actorType: string,
    actorMasks: Record<string, number>,
): CustomFieldDef[] {
    const bitIndex = actorMasks[actorType];
    if (typeof bitIndex === "undefined") return [];
    const bit = 1 << bitIndex;
    return defs.filter((d) => d.name !== "" && (d.actorTypes & bit) !== 0);
}

/**
 * Fresh slot id for a newly added definition: `<prefix>_<random suffix>`.
 * Random rather than sequential so the id of a deleted slot is never handed
 * out again — deleting a slot deliberately leaves its per-actor values in
 * place, and a reused id would attach that stale data to the new slot. The
 * suffix is lowercased to satisfy the id pattern; collisions with current
 * definitions are retried (collisions with long-deleted ids are what the
 * randomness itself makes negligible).
 */
export function freshSlotId(
    existing: Array<{ id: string }>,
    prefix: string,
    randomSuffix: () => string,
): string {
    const used = new Set(existing.map((e) => e.id));
    let id: string;
    do {
        id = `${prefix}_${randomSuffix().toLowerCase()}`;
    } while (used.has(id) || !ID_PATTERN.test(id));
    return id;
}

/**
 * Build the `custom_fields` definitions from the legacy per-slot settings
 * (`custom_field_N`, `_short`, `_type`, `_actor_types`). `read` is injected so
 * the migration can read raw world-settings storage and tests can stub it.
 * Unnamed slots are dropped; ids keep the historic slot number (`cf1`–`cf4`)
 * so migrated per-actor values stay attached.
 */
export function legacyCustomFieldDefs(read: (key: string) => unknown): CustomFieldDef[] {
    const defs: CustomFieldDef[] = [];
    for (const i of [1, 2, 3, 4]) {
        const name = asString(read(`custom_field_${i}`));
        if (name === "") continue;
        const type = read(`custom_field_${i}_type`);
        const actorTypes = Number(read(`custom_field_${i}_actor_types`));
        defs.push({
            id: `${LEGACY_FIELD_ID_PREFIX}${i}`,
            name,
            short: asString(read(`custom_field_${i}_short`)),
            type: type === "number" ? "number" : "string",
            // The legacy registration defaulted to 1 (character only).
            actorTypes: Number.isFinite(actorTypes) ? actorTypes : 1,
        });
    }
    return defs;
}

/**
 * Build the `custom_attributes` definitions from the legacy per-slot settings
 * (`customize_caN_name`, `_name_short`, `_active`). Slots that were never
 * configured (no name and inactive) are dropped; configured slots keep their
 * historic `ca1`–`ca4` ids so per-actor attribute data and `attributes_sorting`
 * entries stay attached.
 */
export function legacyCustomAttributeDefs(read: (key: string) => unknown): CustomAttributeDef[] {
    const defs: CustomAttributeDef[] = [];
    for (const i of [1, 2, 3, 4]) {
        const name = asString(read(`customize_ca${i}_name`));
        const active = read(`customize_ca${i}_active`) === true;
        if (name === "" && !active) continue;
        defs.push({
            id: `${LEGACY_ATTRIBUTE_ID_PREFIX}${i}`,
            name,
            short: asString(read(`customize_ca${i}_name_short`)),
            active,
        });
    }
    return defs;
}
