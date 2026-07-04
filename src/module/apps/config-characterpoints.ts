import OD6SSettingsMenu from "./settings-menu-base";

export default class od6sCharacterPointConfiguration extends OD6SSettingsMenu {
    static SETTINGS_CATEGORY = "od6sCharacterPoints";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-characterpoint-configuration",
        window: {title: "NONEX_IST_OD6S.CONFIG_CHARACTER_POINTS_OPTIONS_MENU"},
    };
}
