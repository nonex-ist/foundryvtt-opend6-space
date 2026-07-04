import OD6SSettingsMenu from "./settings-menu-base";

export default class od6sRevealConfiguration extends OD6SSettingsMenu {
    static SETTINGS_CATEGORY = "od6sReveal";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-reveal-configuration",
        window: {title: "NONEX_IST_OD6S.CONFIG_REVEAL_MENU"},
    };
}
