import od6sCustomLabelsConfiguration from "../../apps/config-labels";
import od6sWildDieConfiguration from "../../apps/config-wild-die";
import od6sDeadlinessConfiguration from "../../apps/config-deadliness";
import od6sRevealConfiguration from "../../apps/config-reveal";
import od6sRulesConfiguration from "../../apps/config-rules";
import od6sDifficultyConfiguration from "../../apps/config-difficulty"
import od6sCustomFieldsConfiguration from "../../apps/config-custom-fields"
import od6sAutomationConfiguration from "../../apps/config-automation"
import od6sInitiativeConfiguration from "../../apps/config-initiative"
import od6sActiveAttributesConfiguration from "../../apps/config-active-attributes";
import od6sCharacterPointConfiguration from "../../apps/config-characterpoints";
import od6sMiscRulesConfiguration from "../../apps/config-miscrules";
import od6sAttributesSortingConfiguration from "../../apps/config-attributes-sorting";
import od6sCustomAttributesConfiguration from "../../apps/config-custom-attributes";
import od6sAppearanceConfiguration from "../../apps/config-appearance";
import od6sMaintenanceConfiguration from "../../apps/config-maintenance";

/**
 * Register the system's settings submenus.
 *
 * Foundry's settings panel (a CategoryBrowser since v13) lists every menu under
 * one "OpenD6 Space" category in registration order, so we register them in
 * logical clusters — Customization, Points & Dice, Rules & Combat, Automation,
 * Appearance, Tools — to keep related options together and easy to find.
 */
export function registerMenuSettings() {
    // ── Customization ──────────────────────────────────────────────
    game.settings.registerMenu("nonex-ist-od6s", "custom_labels_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOM_LABELS"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOM_LABELS_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOMIZE_LABELS"),
        type: od6sCustomLabelsConfiguration,
        restricted: true
    })

    game.settings.registerMenu("nonex-ist-od6s", "custom_fields_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOM_FIELDS"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOM_FIELDS_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOM_FIELDS"),
        type: od6sCustomFieldsConfiguration,
        restricted: true
    })

    game.settings.registerMenu('nonex-ist-od6s', 'active_attributes_menu', {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_ACTIVE_ATTRIBUTES"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_ACTIVE_ATTRIBUTES_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_ACTIVE_ATTRIBUTES_MENU"),
        type: od6sActiveAttributesConfiguration,
        restricted: true
    })

    game.settings.registerMenu('nonex-ist-od6s', 'attributes_sorting_menu', {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_ATTRIBUTES_SORTING"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_ATTRIBUTES_SORTING_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_ATTRIBUTES_SORTING_MENU"),
        type: od6sAttributesSortingConfiguration,
        restricted: true
    })

    game.settings.registerMenu('nonex-ist-od6s', 'custom_attributes_menu', {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOM_ATTRIBUTES_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOM_ATTRIBUTES_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOM_ATTRIBUTES_MENU_LABEL"),
        type: od6sCustomAttributesConfiguration,
        restricted: true
    })

    // ── Points & Dice ──────────────────────────────────────────────
    game.settings.registerMenu("nonex-ist-od6s", "character_point_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CHARACTER_POINT_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CHARACTER_POINT_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CHARACTER_POINT_MENU"),
        type: od6sCharacterPointConfiguration,
        restricted: true
    })

    game.settings.registerMenu("nonex-ist-od6s", "wild_die_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_WILD_DIE_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_WILD_DIE_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_WILD_DIE_MENU_LABEL"),
        type: od6sWildDieConfiguration,
        restricted: true
    })

    game.settings.registerMenu("nonex-ist-od6s", "deadliness_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_DEADLINESS_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_DEADLINESS_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_DEADLINESS_MENU"),
        type: od6sDeadlinessConfiguration,
        restricted: true
    })

    game.settings.registerMenu("nonex-ist-od6s", "difficulty_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_DIFFICULTY_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_DIFFICULTY_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_DIFFICULTY_MENU_LABEL"),
        type: od6sDifficultyConfiguration,
        restricted: true
    })

    // ── Rules & Combat ─────────────────────────────────────────────
    game.settings.registerMenu("nonex-ist-od6s", "rules_options_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_RULES_OPTIONS_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_RULES_OPTIONS_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_RULES_OPTIONS_MENU_LABEL"),
        type: od6sRulesConfiguration,
        restricted: true
    })

    game.settings.registerMenu("nonex-ist-od6s", "misc_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_MISC_RULES"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_MISC_RULES_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_CUSTOMIZE_MISC"),
        type: od6sMiscRulesConfiguration,
        restricted: true
    })

    game.settings.registerMenu("nonex-ist-od6s", "initiative_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_INITIATIVE_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_INITIATIVE_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_INITIATIVE_MENU_LABEL"),
        type: od6sInitiativeConfiguration,
        restricted: true
    })

    game.settings.registerMenu("nonex-ist-od6s", "reveal_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_REVEAL_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_REVEAL_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_REVEAL_MENU_LABEL"),
        type: od6sRevealConfiguration,
        restricted: true
    })

    // ── Automation ─────────────────────────────────────────────────
    game.settings.registerMenu("nonex-ist-od6s", "automation_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_AUTOMATION_OPTIONS_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_AUTOMATION_OPTIONS_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_AUTOMATION_OPTIONS_MENU_LABEL"),
        type: od6sAutomationConfiguration,
        restricted: true
    })

    // ── Appearance ─────────────────────────────────────────────────
    // Open to all: it holds each player's own client-scoped prefs (chat
    // colours, sheet opacity) alongside GM-only display toggles, which the
    // dialog hides from non-GMs.
    game.settings.registerMenu("nonex-ist-od6s", "appearance_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_APPEARANCE_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_APPEARANCE_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_APPEARANCE_MENU_LABEL"),
        type: od6sAppearanceConfiguration,
        restricted: false,
        icon: "fas fa-palette"
    })

    // ── Tools ──────────────────────────────────────────────────────
    game.settings.registerMenu("nonex-ist-od6s", "maintenance_menu", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_MAINTENANCE_MENU"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_MAINTENANCE_MENU_DESCRIPTION"),
        label: game.i18n.localize("NONEX_IST_OD6S.CONFIG_MAINTENANCE_MENU_LABEL"),
        type: od6sMaintenanceConfiguration,
        restricted: true,
        icon: "fas fa-wrench"
    })
}
