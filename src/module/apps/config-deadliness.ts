import OD6SSettingsMenu from "./settings-menu-base";

export default class od6sDeadlinessConfiguration extends OD6SSettingsMenu {
    static SETTINGS_CATEGORY = "od6sDeadliness";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-deadliness-configuration",
        window: {title: "NONEX_IST_OD6S.CONFIG_DEADLINESS_MENU"},
    };
}
