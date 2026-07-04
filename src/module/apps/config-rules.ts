import OD6SSettingsMenu from "./settings-menu-base";

export default class od6sRulesConfiguration extends OD6SSettingsMenu {
    static SETTINGS_CATEGORY = "od6sRules";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-rules-configuration",
        window: {title: "NONEX_IST_OD6S.CONFIG_RULES_OPTIONS_MENU"},
    };

    protected override settingGroups(): Array<{label: string; keys: string[]}> {
        const P = "NONEX_IST_OD6S.";
        return [
            {label: P + "CONFIG_RULES_GROUP_DAMAGE", keys: [
                "bodypoints", "track_stuns", "stun_damage_increment", "stun_dice",
                "highhitdamage", "strength_damage", "weapon_armor_damage",
                "random_hit_locations", "passenger_damage_dice",
            ]},
            {label: P + "CONFIG_RULES_GROUP_COMBAT", keys: [
                "fastcombat", "melee_difficulty", "hide_advantages_disadvantages",
            ]},
            {label: P + "CONFIG_RULES_GROUP_SCALE", keys: [
                "dice_for_scale", "vehicle_difficulty", "sensors", "map_range_to_difficulty",
            ]},
            {label: P + "CONFIG_RULES_GROUP_EXPLOSIVES", keys: [
                "dice_for_grenades", "explosive_end_of_round", "hide_explosive_templates", "explosive_zones",
            ]},
            {label: P + "CONFIG_RULES_GROUP_SKILLS", keys: [
                "specialization_dice", "pip_per_dice", "flat_skills", "skill_used", "spec_link",
                "metaphysics_attribute_optional",
            ]},
            {label: P + "CONFIG_RULES_GROUP_CURRENCY", keys: [
                "cost", "funds_fate",
            ]},
            {label: P + "CONFIG_RULES_GROUP_CHARGEN", keys: [
                "initial_attributes", "initial_skills", "initial_character_points",
                "initial_fate_points", "initial_move",
            ]},
        ];
    }
}
