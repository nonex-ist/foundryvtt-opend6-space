import OD6S from "../config-od6s";

type CategoryFlag =
    | "od6sLabel"
    | "od6sCustomField"
    | "od6sCustomAttribute"
    | "od6sDeadliness"
    | "od6sDifficulty"
    | "od6sMiscRules";

interface DefineSettingOptions<T> {
    /** i18n key for `name`. The matching `_DESCRIPTION` key is used for `hint` unless `noHint` is true. */
    i18nKey: string;
    /** Skip the auto-derived hint (some settings have no _DESCRIPTION entry). */
    noHint?: boolean;
    type: typeof Number | typeof Boolean | typeof String;
    default: T;
    requiresReload?: boolean;
    choices?: Record<string, string>;
    /** Sets the OD6S category flag (e.g. od6sLabel: true) used by the settings UI to group settings. */
    category?: CategoryFlag;
    /** Used by custom-field settings to mark the actor-types selector. */
    actorType?: boolean;
    onChange?: (value: T) => void;
}

export function defineSetting<T>(key: string, opts: DefineSettingOptions<T>): void {
    const config: Record<string, unknown> = {
        scope: "world",
        config: false,
        name: game.i18n.localize(opts.i18nKey),
        type: opts.type,
        default: opts.default,
    };
    if (!opts.noHint) {
        config.hint = game.i18n.localize(opts.i18nKey + "_DESCRIPTION");
    }
    if (opts.requiresReload) config.requiresReload = true;
    if (opts.choices) config.choices = opts.choices;
    if (opts.category) config[opts.category] = true;
    if (opts.actorType) config.actorType = true;
    if (opts.onChange) config.onChange = opts.onChange;

    game.settings.register("nonex-ist-od6s", key, config as never);
}

/**
 * Register a customizable label string. Empty value falls back to the localized default
 * via `updateConfig()` on next reload — onChange only fires for non-empty values.
 */
export function defineLabel(
    key: string,
    i18nKey: string,
    apply: (value: string) => void,
    opts: { requiresReload?: boolean; category?: CategoryFlag } = {},
): void {
    defineSetting<string>(key, {
        i18nKey,
        type: String,
        default: "",
        requiresReload: opts.requiresReload ?? true,
        category: opts.category ?? "od6sLabel",
        onChange: (value) => {
            if (value) apply(value);
        },
    });
}

/** Register a custom-character-sheet field setting (name, name_short, type, or actor_types). */
export function defineCustomField(
    key: string,
    i18nKey: string,
    opts: {
        type?: typeof String | typeof Number;
        default?: string | number;
        choices?: Record<string, string>;
        actorType?: boolean;
    } = {},
): void {
    defineSetting(key, {
        i18nKey,
        type: opts.type ?? String,
        default: opts.default ?? "",
        requiresReload: true,
        category: "od6sCustomField",
        actorType: opts.actorType,
        choices: opts.choices,
    });
}

const deadlinessChoices = (): Record<string, string> => ({
    "1": game.i18n.localize("NONEX_IST_OD6S.CONFIG_DEADLINESS_1"),
    "2": game.i18n.localize("NONEX_IST_OD6S.CONFIG_DEADLINESS_2"),
    "3": game.i18n.localize("NONEX_IST_OD6S.CONFIG_DEADLINESS_3"),
    "4": game.i18n.localize("NONEX_IST_OD6S.CONFIG_DEADLINESS_4"),
    "5": game.i18n.localize("NONEX_IST_OD6S.CONFIG_DEADLINESS_5"),
});

export function defineDeadliness(
    key: string,
    i18nKey: string,
    actorBucket: "character" | "npc" | "creature",
    defaultLevel: number,
): void {
    defineSetting<number>(key, {
        i18nKey,
        type: Number,
        default: defaultLevel,
        requiresReload: true,
        category: "od6sDeadliness",
        choices: deadlinessChoices(),
        onChange: (value) => {
            OD6S.deadlinessLevel[actorBucket] = value;
        },
    });
}

/**
 * Register a difficulty-tier max threshold (e.g. moderate ≤ 15).
 * These have no hint key (only a name), and the i18nKey here is the *display name* directly.
 */
export function defineDifficultyMax(
    key: string,
    i18nKey: string,
    difficultyKey: string,
    defaultMax: number,
): void {
    defineSetting<number>(key, {
        i18nKey,
        noHint: true,
        type: Number,
        default: defaultMax,
        requiresReload: true,
        category: "od6sDifficulty",
        onChange: (value) => {
            OD6S.difficulty[difficultyKey].max = value;
        },
    });
}
