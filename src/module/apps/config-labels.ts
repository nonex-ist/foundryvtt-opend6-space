import OD6SSettingsMenu from "./settings-menu-base";

/**
 * Built-in default label each custom-label setting falls back to when left
 * blank (mirrors the fallbacks in settings/index.ts `updateConfig`). Shown as an
 * input placeholder so an empty field advertises what it will display while
 * staying genuinely unset. Keep in sync with `updateConfig`.
 */
function labelDefaultKeys(): Record<string, string> {
    const P = "NONEX_IST_OD6S.";
    const map: Record<string, string> = {
        customize_species_label: P + "CHAR_SPECIES",
        customize_type_label: P + "CHAR_TYPE",
        customize_fate_points: P + "CHAR_FATE_POINTS",
        customize_fate_points_short: P + "CHAR_FATE_POINTS_SHORT",
        customize_use_a_fate_point: P + "USE_FATE_POINT",
        customize_currency_label: P + "CHAR_CREDITS",
        customize_vehicle_toughness: P + "TOUGHNESS",
        customize_starship_toughness: P + "TOUGHNESS",
        customize_manifestations: P + "CHAR_MANIFESTATIONS",
        customize_manifestation: P + "CHAR_MANIFESTATION",
        customize_metaphysics_name: P + "CHAR_METAPHYSICS",
        customize_metaphysics_name_short: P + "CHAR_METAPHYSICS_SHORT",
        customize_metaphysics_extranormal: P + "CHAR_METAPHYSICS_EXTRANORMAL",
        customize_metaphysics_skill_channel: P + "METAPHYSICS_SKILL_CHANNEL",
        customize_metaphysics_skill_sense: P + "METAPHYSICS_SKILL_SENSE",
        customize_metaphysics_skill_transform: P + "METAPHYSICS_SKILL_TRANSFORM",
        customize_body_points_name: P + "BODY_POINTS",
    };
    for (const a of ["agility", "strength", "mechanical", "knowledge", "perception", "technical"]) {
        const u = a.toUpperCase();
        map[`customize_${a}_name`] = `${P}CHAR_${u}`;
        map[`customize_${a}_name_short`] = `${P}CHAR_${u}_SHORT`;
    }
    // Custom attributes (CA1–4) moved to their own menu — see config-custom-attributes.ts.
    return map;
}

export default class od6sCustomLabelsConfiguration extends OD6SSettingsMenu {
    static SETTINGS_CATEGORY = "od6sLabel";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-customlabels-configuration",
        window: {title: "NONEX_IST_OD6S.CONFIG_CUSTOM_LABELS"},
    };

    protected override placeholderKeys(): Record<string, string> {
        return labelDefaultKeys();
    }

    protected override settingGroups(): Array<{label: string; keys: string[]}> {
        const P = "NONEX_IST_OD6S.";
        const attr = ["agility", "strength", "mechanical", "knowledge", "perception", "technical"]
            .flatMap((a) => [`customize_${a}_name`, `customize_${a}_name_short`]);
        return [
            {label: P + "CONFIG_LABELS_GROUP_SHEET", keys: ["customize_species_label", "customize_type_label"]},
            {label: P + "CONFIG_LABELS_GROUP_ATTRIBUTES", keys: attr},
            {label: P + "CONFIG_LABELS_GROUP_FATE", keys: [
                "customize_fate_points", "customize_fate_points_short", "customize_use_a_fate_point",
            ]},
            {label: P + "CONFIG_LABELS_GROUP_METAPHYSICS", keys: [
                "customize_metaphysics_name", "customize_metaphysics_name_short",
                "customize_metaphysics_extranormal", "customize_metaphysics_skill_channel",
                "customize_metaphysics_skill_sense", "customize_metaphysics_skill_transform",
            ]},
            {label: P + "CONFIG_LABELS_GROUP_MANIFESTATIONS", keys: [
                "customize_manifestations", "customize_manifestation",
            ]},
            {label: P + "CONFIG_LABELS_GROUP_VEHICLES", keys: [
                "customize_vehicle_toughness", "customize_starship_toughness",
            ]},
            {label: P + "CONFIG_LABELS_GROUP_OTHER", keys: [
                "customize_currency_label", "customize_body_points_name",
            ]},
        ];
    }
}
