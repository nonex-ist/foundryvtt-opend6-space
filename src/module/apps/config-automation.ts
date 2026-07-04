import OD6SSettingsMenu from "./settings-menu-base";

export default class od6sAutomationConfiguration extends OD6SSettingsMenu {
    static SETTINGS_CATEGORY = "od6sAutomation";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-automation-configuration",
        window: {title: "NONEX_IST_OD6S.CONFIG_AUTOMATION_OPTIONS_MENU"},
    };

    protected override settingGroups(): Array<{label: string; keys: string[]}> {
        const P = "NONEX_IST_OD6S.";
        return [
            {label: P + "CONFIG_AUTOMATION_GROUP_ROLLS", keys: [
                "auto_opposed", "auto_prompt_player_resistance", "auto_skill_used",
            ]},
            {label: P + "CONFIG_AUTOMATION_GROUP_STATUS", keys: [
                "auto_stunned", "auto_incapacitated", "auto_mortally_wounded", "auto_status",
            ]},
            {label: P + "CONFIG_AUTOMATION_GROUP_DAMAGE", keys: [
                "auto_explosive", "auto_armor_damage",
            ]},
        ];
    }
}
