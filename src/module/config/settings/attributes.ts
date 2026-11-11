import OD6S from "../config-od6s";

export function registerAttributeSettings() {
    game.settings.register('nonex-ist-od6s', 'attributes_sorting', {
        scope: "world",
        config: false,
        type: Object,
        default: {}
    })

    game.settings.register("nonex-ist-od6s", "customize_agi_active", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_AGI_ACTIVE"),
        scope: "world",
        config: false,
        od6sActiveAttributesConfiguration: true,
        type: Boolean,
        default: true,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.attributes.agi.active = value)
    })

    game.settings.register("nonex-ist-od6s", "customize_str_active", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_STR_ACTIVE"),
        scope: "world",
        config: false,
        od6sActiveAttributesConfiguration: true,
        type: Boolean,
        default: true,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.attributes.str.active = value)
    })

    game.settings.register("nonex-ist-od6s", "customize_mec_active", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_MEC_ACTIVE"),
        scope: "world",
        config: false,
        od6sActiveAttributesConfiguration: true,
        type: Boolean,
        default: true,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.attributes.mec.active = value)
    })

    game.settings.register("nonex-ist-od6s", "customize_kno_active", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_KNO_ACTIVE"),
        scope: "world",
        config: false,
        od6sActiveAttributesConfiguration: true,
        type: Boolean,
        default: true,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.attributes.kno.active = value)
    })

    game.settings.register("nonex-ist-od6s", "customize_per_active", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_PER_ACTIVE"),
        scope: "world",
        config: false,
        od6sActiveAttributesConfiguration: true,
        type: Boolean,
        default: true,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.attributes.per.active = value)
    })

    game.settings.register("nonex-ist-od6s", "customize_tec_active", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_TEC_ACTIVE"),
        scope: "world",
        config: false,
        od6sActiveAttributesConfiguration: true,
        type: Boolean,
        default: true,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.attributes.tec.active = value)
    })

    game.settings.register("nonex-ist-od6s", "customize_met_active", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_MET_ACTIVE"),
        scope: "world",
        config: false,
        od6sActiveAttributesConfiguration: true,
        type: Boolean,
        default: true,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.attributes.met.active = value)
    })
}
