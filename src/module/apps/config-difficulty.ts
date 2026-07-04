import OD6SSettingsMenu from "./settings-menu-base";

export default class od6sDifficultyConfiguration extends OD6SSettingsMenu {
    static SETTINGS_CATEGORY = "od6sDifficulty";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-difficulty-configuration",
        window: {title: "NONEX_IST_OD6S.CONFIG_DIFFICULTY_MENU"},
    };
}
