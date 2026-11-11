/**
 * Runtime glue for the dynamic custom-field / custom-attribute slots (#199).
 * The definitions live in two array-valued world settings; the pure list
 * handling sits in `system/custom-slots.ts`. Both settings require a reload:
 * custom attributes are baked into the actor schema at init, and open sheets
 * only pick up field changes on re-render.
 */
import OD6S from "../config-od6s";
import type {
    CustomAttributeDef,
    CustomFieldDef} from "../../system/custom-slots";
import {
    legacyCustomAttributeDefs,
    normalizeCustomAttributeDefs,
    normalizeCustomFieldDefs,
    visibleCustomFields,
} from "../../system/custom-slots";

const NS = "nonex-ist-od6s";

/**
 * Read a world setting's stored value straight from the settings storage.
 * Returns `undefined` when no Setting document exists for the key. Unlike
 * `game.settings.get`, this also works for unregistered (legacy) keys, which
 * is what the #199 migration and the pre-migration schema fallback need.
 *
 * `Setting#value` is a `JSONField`, which already parses the stored JSON on
 * initialization — do not parse it again, or a legacy name that happens to be
 * a JSON literal (e.g. "42", "true") would come back as a number/boolean and
 * be dropped by the migration's string check.
 */
export function readRawWorldSetting(key: string): unknown {
    type StoredSetting = {key: string; value: unknown};
    const storage = (game.settings as unknown as {storage?: Map<string, Iterable<StoredSetting>>}).storage;
    for (const setting of storage?.get("world") ?? []) {
        if (setting.key === `${NS}.${key}`) return setting.value;
    }
    return undefined;
}

export function registerCustomSlotSettings() {
    game.settings.register(NS, "custom_fields", {
        name: "Custom Fields",
        scope: "world",
        config: false,
        type: Array,
        default: [],
        requiresReload: true,
    });

    game.settings.register(NS, "custom_attributes", {
        name: "Custom Attributes",
        scope: "world",
        config: false,
        type: Array,
        default: [],
        requiresReload: true,
    });
}

/** All configured header-field definitions, cleaned. */
export function getConfiguredCustomFields(): CustomFieldDef[] {
    try {
        return normalizeCustomFieldDefs(game.settings.get(NS, "custom_fields"));
    } catch {
        // Setting not registered yet (e.g. schema access outside a world).
        return [];
    }
}

/** All configured custom-attribute definitions, cleaned. Live read — see
 * `getSchemaCustomAttributes` for the schema-stable view. */
export function getConfiguredCustomAttributes(): CustomAttributeDef[] {
    try {
        return normalizeCustomAttributeDefs(game.settings.get(NS, "custom_attributes"));
    } catch {
        return [];
    }
}

let schemaAttributeDefs: CustomAttributeDef[] | null = null;

/**
 * Custom-attribute definitions as baked into this session's actor schema.
 * Memoized on the first successful read (during settings registration at
 * init): the schema is built once per session, so the runtime attribute
 * registry must keep matching it even after the `custom_attributes` setting
 * changes mid-session — the settings menu saves immediately, and
 * `updateConfig()` re-runs on every `renderSettingsConfig`. A live read here
 * would desync registry and schema and crash actor preparation. Changes take
 * effect on reload, when the memo is rebuilt alongside the schema.
 *
 * Upgrade path: when the setting has never been written (no stored Setting
 * document — a pre-#199 world on its first launch, before the world migration
 * runs at ready), fall back to converting the legacy `customize_caN_*` values
 * so ca1–ca4 stay part of the schema from the very first session and no
 * attribute data is dropped while the migration and its reload are pending.
 */
export function getSchemaCustomAttributes(): CustomAttributeDef[] {
    if (schemaAttributeDefs) return schemaAttributeDefs;
    try {
        schemaAttributeDefs = readRawWorldSetting("custom_attributes") === undefined
            ? legacyCustomAttributeDefs(readRawWorldSetting)
            : normalizeCustomAttributeDefs(game.settings.get(NS, "custom_attributes"));
        return schemaAttributeDefs;
    } catch {
        // Setting not registered yet (e.g. schema access outside a world) —
        // don't memoize a transiently empty result.
        return [];
    }
}

/** Render model for one header field on an actor sheet. */
export interface CustomFieldRenderModel {
    id: string;
    label: string;
    inputType: "text" | "number";
    dtype: "String" | "Number";
}

/** Header fields visible for an actor type, shaped for the header templates. */
export function getVisibleCustomFields(actorType: string): CustomFieldRenderModel[] {
    return visibleCustomFields(getConfiguredCustomFields(), actorType, OD6S.actorMasks)
        .map((d) => ({
            id: d.id,
            label: d.short || d.name,
            inputType: d.type === "number" ? "number" : "text",
            dtype: d.type === "number" ? "Number" : "String",
        }));
}
