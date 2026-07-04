import OD6S from "../config-od6s";
import {applySheetPointerBleedSetting} from "../../system/sheet-pointer-bleed";

export function applySheetBackgroundOpacity(value: number): void {
    const clamped = Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
    document.documentElement.style.setProperty("--nonex-ist-od6s-sheet-opacity", String(clamped));
}

export function registerDisplaySettings() {
    game.settings.register("nonex-ist-od6s", "hide_compendia", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_HIDE_COMPENDIA"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_HIDE_COMPENDIA_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAppearance: true,
        default: false,
        type: Boolean,
        onChange: () => {
            ui.compendium.render();
        }
    })

    game.settings.register("nonex-ist-od6s", "hide-skill-cards", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_HIDE_SKILL_ROLLS"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_HIDE_SKILL_ROLLS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("nonex-ist-od6s", "hide-combat-cards", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_HIDE_ATTACK_ROLLS"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_HIDE_ATTACK_ROLLS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("nonex-ist-od6s", "roll-modifiers", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_SHOW_MODIFIERS"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_SHOW_MODIFIERS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("nonex-ist-od6s", "show-roll-difficulty", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_SHOW_DIFFICULTY_DROPDOWN"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_SHOW_DIFFICULTY_DROPDOWN_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("nonex-ist-od6s", "hide-gm-rolls", {
        name: game.i18n.localize("NONEX_IST_OD6S.CONFIG_HIDE_GM_ROLLS"),
        hint: game.i18n.localize("NONEX_IST_OD6S.CONFIG_HIDE_GM_ROLLS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("nonex-ist-od6s", "highlight_effects", {
        name: game.i18n.localize('NONEX_IST_OD6S.CONFIG_HIGHLIGHT_EFFECTS'),
        hint: game.i18n.localize('NONEX_IST_OD6S.CONFIG_HIGHLIGHT_EFFECTS_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sAppearance: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.highlightEffects = value
    })

    game.settings.register("nonex-ist-od6s", "show_skill_specialization", {
        name: game.i18n.localize('NONEX_IST_OD6S.CONFIG_SHOW_SKILL_SPECIALIZATION'),
        hint: game.i18n.localize('NONEX_IST_OD6S.CONFIG_SHOW_SKILL_SPECIALIZATION_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sAppearance: true,
        default: true,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.showSkillSpecialization = value
    })

    game.settings.register("nonex-ist-od6s", "sheet_background_opacity", {
        name: game.i18n.localize('NONEX_IST_OD6S.CONFIG_SHEET_BACKGROUND_OPACITY'),
        hint: game.i18n.localize('NONEX_IST_OD6S.CONFIG_SHEET_BACKGROUND_OPACITY_DESCRIPTION'),
        scope: "client",
        config: false,
        od6sAppearance: true,
        default: 1,
        type: Number,
        range: {min: 0, max: 2, step: 0.05},
        onChange: (value: number) => applySheetBackgroundOpacity(value),
    });

    applySheetBackgroundOpacity(game.settings.get('nonex-ist-od6s', 'sheet_background_opacity') as number);

    game.settings.register("nonex-ist-od6s", "block_sheet_pointer_bleed", {
        name: game.i18n.localize('NONEX_IST_OD6S.CONFIG_BLOCK_SHEET_POINTER_BLEED'),
        hint: game.i18n.localize('NONEX_IST_OD6S.CONFIG_BLOCK_SHEET_POINTER_BLEED_DESCRIPTION'),
        scope: "client",
        config: false,
        od6sAppearance: true,
        default: false,
        type: Boolean,
        onChange: (value: boolean) => applySheetPointerBleedSetting(value),
    });

    applySheetPointerBleedSetting(game.settings.get('nonex-ist-od6s', 'block_sheet_pointer_bleed') as boolean);

    game.settings.register("nonex-ist-od6s", "show_metaphysics_attributes", {
        name: game.i18n.localize('NONEX_IST_OD6S.CONFIG_SHOW_METAPHYSICS_ATTRIBUTES'),
        hint: game.i18n.localize('NONEX_IST_OD6S.CONFIG_SHOW_METAPHYSICS_ATTRIBUTES_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sAppearance: true,
        default: false,
        type: Boolean,
        requiresReload: true
    })
}
