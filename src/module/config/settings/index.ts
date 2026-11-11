import OD6S from "../config-od6s";
import {createOD6SMacro} from "../../macros";

import {registerMenuSettings} from "./menus";
import {registerCharacterPointSettings} from "./character-points";
import {registerWildDieSettings} from "./wild-die";
import {registerCombatSettings} from "./combat";
import {registerDisplaySettings} from "./display";
import {registerLabelSettings} from "./labels";
import {registerRulesSettings} from "./rules";
import {registerAttributeSettings} from "./attributes";
import {registerAutomationSettings} from "./automation";
import {registerMiscSettings} from "./misc";
import {registerChatColorSettings} from "./chat-colors";
import {registerCustomSlotSettings, getSchemaCustomAttributes} from "./custom-slots";
import {CORE_ATTRIBUTE_KEYS} from "../attributes";

export {updateRerollInitiative} from "./combat";

export async function registerSettings() {
    registerMenuSettings();
    registerCharacterPointSettings();
    registerAutomationSettings();
    registerCombatSettings();
    registerLabelSettings();
    registerDisplaySettings();
    registerWildDieSettings();
    registerRulesSettings();
    registerAttributeSettings();
    registerMiscSettings();
    registerChatColorSettings();
    registerCustomSlotSettings();

    updateConfig();
}

let hotbarDropRegistered = false;

export function updateConfig() {
    // updateConfig re-runs on init, i18nInit and every renderSettingsConfig; register the hook only once.
    if (!hotbarDropRegistered) {
        hotbarDropRegistered = true;
        Hooks.on("hotbarDrop", (bar: any, data: any, slot: any) => createOD6SMacro(data, slot));
    }

    // Misc Rules Options
    OD6S.meleeRange = game.settings.get('nonex-ist-od6s','melee_range');
    OD6S.highHitDamageRound = game.settings.get('nonex-ist-od6s', 'highhit_round');
    OD6S.highHitDamagePipsOrDice = game.settings.get('nonex-ist-od6s', 'highhit_pipsordice');
    OD6S.highHitDamageMultiplier = game.settings.get('nonex-ist-od6s', 'character_highhitmultiplier');
    OD6S.advanceCostAttribute = game.settings.get('nonex-ist-od6s', 'character_advanceCostAttribute');
    OD6S.advanceCostSkill = game.settings.get('nonex-ist-od6s', 'character_advanceCostSkill');
    OD6S.advanceCostMetaphysicsSkill = game.settings.get('nonex-ist-od6s', 'character_metaphysics_advanceCostSkill');
    OD6S.advanceCostSpecialization = game.settings.get('nonex-ist-od6s', 'character_advanceCostSpecialization');
    OD6S.resistanceOption = game.settings.get('nonex-ist-od6s','customize_resistanceOption');
    OD6S.resistanceSkill = game.settings.get('nonex-ist-od6s', 'customize_resistanceSkill');
    OD6S.resistanceRound = game.settings.get('nonex-ist-od6s', 'resistance_round');
    OD6S.resistanceMultiplier = game.settings.get('nonex-ist-od6s', 'character_resistanceMultiplier');
    OD6S.strDamRound = game.settings.get('nonex-ist-od6s', 'strDam_round');
    OD6S.strDamMultiplier = game.settings.get('nonex-ist-od6s', 'character_strDamMultiplier');
    OD6S.strDamSkill = game.settings.get('nonex-ist-od6s', 'customize_strDamSkill');
    OD6S.od6Bonus = game.settings.get('nonex-ist-od6s', 'od6_bonus');

    // end Misc Rules Options.


    // Set customizations
    OD6S.speciesLabelName = game.settings.get('nonex-ist-od6s','customize_species_label') ?
        game.settings.get('nonex-ist-od6s', 'customize_species_label') : game.i18n.localize('NONEX_IST_OD6S.CHAR_SPECIES');
    OD6S.typeLabel = game.settings.get('nonex-ist-od6s','customize_type_label') ?
        game.settings.get('nonex-ist-od6s', 'customize_type_label') : game.i18n.localize('NONEX_IST_OD6S.CHAR_TYPE');
    OD6S.fatePointsName = game.settings.get('nonex-ist-od6s', 'customize_fate_points') ?
        game.settings.get('nonex-ist-od6s', 'customize_fate_points') : game.i18n.localize('NONEX_IST_OD6S.CHAR_FATE_POINTS');
    OD6S.fatePointsShortName = game.settings.get('nonex-ist-od6s', 'customize_fate_points_short') ?
        game.settings.get('nonex-ist-od6s', 'customize_fate_points_short') : game.i18n.localize('NONEX_IST_OD6S.CHAR_FATE_POINTS_SHORT');

    OD6S.manifestationsName = game.settings.get('nonex-ist-od6s', 'customize_manifestations') ?
        game.settings.get('nonex-ist-od6s', 'customize_manifestations') : game.i18n.localize('NONEX_IST_OD6S.CHAR_MANIFESTATIONS');

    OD6S.manifestationName = game.settings.get('nonex-ist-od6s', 'customize_manifestation') ?
        game.settings.get('nonex-ist-od6s', 'customize_manifestation') : game.i18n.localize('NONEX_IST_OD6S.CHAR_MANIFESTATION');

    OD6S.metaphysicsExtranormalName = game.settings.get('nonex-ist-od6s', 'customize_metaphysics_extranormal') ?
        game.settings.get('nonex-ist-od6s', 'customize_metaphysics_extranormal') : game.i18n.localize('NONEX_IST_OD6S.CHAR_METAPHYSICS_EXTRANORMAL');

    OD6S.vehicleToughnessName = game.settings.get('nonex-ist-od6s', 'customize_vehicle_toughness') ?
        game.settings.get('nonex-ist-od6s', 'customize_vehicle_toughness') : game.i18n.localize('NONEX_IST_OD6S.TOUGHNESS');

    OD6S.starshipToughnessName = game.settings.get('nonex-ist-od6s', 'customize_starship_toughness') ?
        game.settings.get('nonex-ist-od6s', 'customize_starship_toughness') : game.i18n.localize('NONEX_IST_OD6S.TOUGHNESS');

    OD6S.useAFatePointName = game.settings.get('nonex-ist-od6s', 'customize_use_a_fate_point') ?
        game.settings.get('nonex-ist-od6s', 'customize_use_a_fate_point') : game.i18n.localize('NONEX_IST_OD6S.USE_FATE_POINT');

    OD6S.attributes.agi.name = game.settings.get('nonex-ist-od6s', 'customize_agility_name') ?
        game.settings.get('nonex-ist-od6s', 'customize_agility_name') : game.i18n.localize('NONEX_IST_OD6S.CHAR_AGILITY');
    OD6S.attributes.agi.shortName = game.settings.get('nonex-ist-od6s', 'customize_agility_name_short') ?
        game.settings.get('nonex-ist-od6s', 'customize_agility_name_short') : game.i18n.localize('NONEX_IST_OD6S.CHAR_AGILITY_SHORT');

    OD6S.attributes.str.name = game.settings.get('nonex-ist-od6s', 'customize_strength_name') ?
        game.settings.get('nonex-ist-od6s', 'customize_strength_name') : game.i18n.localize('NONEX_IST_OD6S.CHAR_STRENGTH');
    OD6S.attributes.str.shortName = game.settings.get('nonex-ist-od6s', 'customize_strength_name_short') ?
        game.settings.get('nonex-ist-od6s', 'customize_strength_name_short') : game.i18n.localize('NONEX_IST_OD6S.CHAR_STRENGTH_SHORT');

    OD6S.attributes.mec.name = game.settings.get('nonex-ist-od6s', 'customize_mechanical_name') ?
        game.settings.get('nonex-ist-od6s', 'customize_mechanical_name') : game.i18n.localize('NONEX_IST_OD6S.CHAR_MECHANICAL');
    OD6S.attributes.mec.shortName = game.settings.get('nonex-ist-od6s', 'customize_mechanical_name_short') ?
        game.settings.get('nonex-ist-od6s', 'customize_mechanical_name_short') : game.i18n.localize('NONEX_IST_OD6S.CHAR_MECHANICAL_SHORT');

    OD6S.attributes.kno.name = game.settings.get('nonex-ist-od6s', 'customize_knowledge_name') ?
        game.settings.get('nonex-ist-od6s', 'customize_knowledge_name') : game.i18n.localize('NONEX_IST_OD6S.CHAR_KNOWLEDGE');
    OD6S.attributes.kno.shortName = game.settings.get('nonex-ist-od6s', 'customize_knowledge_name_short') ?
        game.settings.get('nonex-ist-od6s', 'customize_knowledge_name_short') : game.i18n.localize('NONEX_IST_OD6S.CHAR_KNOWLEDGE_SHORT');

    OD6S.attributes.per.name = game.settings.get('nonex-ist-od6s', 'customize_perception_name') ?
        game.settings.get('nonex-ist-od6s', 'customize_perception_name') : game.i18n.localize('NONEX_IST_OD6S.CHAR_PERCEPTION');
    OD6S.attributes.per.shortName = game.settings.get('nonex-ist-od6s', 'customize_perception_name_short') ?
        game.settings.get('nonex-ist-od6s', 'customize_perception_name_short') : game.i18n.localize('NONEX_IST_OD6S.CHAR_PERCEPTION_SHORT');

    OD6S.attributes.tec.name = game.settings.get('nonex-ist-od6s', 'customize_technical_name') ?
        game.settings.get('nonex-ist-od6s', 'customize_technical_name') : game.i18n.localize('NONEX_IST_OD6S.CHAR_TECHNICAL');
    OD6S.attributes.tec.shortName = game.settings.get('nonex-ist-od6s', 'customize_technical_name_short') ?
        game.settings.get('nonex-ist-od6s', 'customize_technical_name_short') : game.i18n.localize('NONEX_IST_OD6S.CHAR_TECHNICAL_SHORT');

    OD6S.attributes.met.name = game.settings.get('nonex-ist-od6s', 'customize_metaphysics_name') ?
        game.settings.get('nonex-ist-od6s', 'customize_metaphysics_name') : game.i18n.localize('NONEX_IST_OD6S.CHAR_METAPHYSICS');
    OD6S.attributes.met.shortName = game.settings.get('nonex-ist-od6s', 'customize_metaphysics_name_short') ?
        game.settings.get('nonex-ist-od6s', 'customize_metaphysics_name_short') : game.i18n.localize('NONEX_IST_OD6S.CHAR_METAPHYSICS_SHORT');

    OD6S.interstellarDriveName = game.settings.get('nonex-ist-od6s', 'interstellar_drive_name') ?
        game.settings.get('nonex-ist-od6s', 'interstellar_drive_name') : game.i18n.localize('NONEX_IST_OD6S.INTERSTELLAR_DRIVE');

    OD6S.bodyPointsName = game.settings.get('nonex-ist-od6s', 'customize_body_points_name') ?
        game.settings.get('nonex-ist-od6s', 'customize_body_points_name') : game.i18n.localize('NONEX_IST_OD6S.BODY_POINTS');

    OD6S.wildDieOneDefault = game.settings.get('nonex-ist-od6s', 'default_wild_one');
    OD6S.wildDieOneAuto = game.settings.get('nonex-ist-od6s', 'default_wild_die_one_handle');

    OD6S.vehicleDifficulty = game.settings.get('nonex-ist-od6s', 'vehicle_difficulty');

    OD6S.stunDice = game.settings.get('nonex-ist-od6s', 'stun_dice');

    OD6S.passengerDamageDice = game.settings.get('nonex-ist-od6s', 'passenger_damage_dice');

    OD6S.grenadeDamageDice = game.settings.get('nonex-ist-od6s', 'dice_for_grenades');

    OD6S.highlightEffects = game.settings.get('nonex-ist-od6s', 'highlight_effects');

    OD6S.randomHitLocations = game.settings.get('nonex-ist-od6s', 'random_hit_locations');

    OD6S.mapRange = game.settings.get('nonex-ist-od6s', 'map_range_to_difficulty');
    OD6S.meleeDifficulty = game.settings.get('nonex-ist-od6s', 'melee_difficulty');
    OD6S.randomDifficulty = game.settings.get('nonex-ist-od6s', 'random_difficulty');

    OD6S.baseRangedAttackDifficulty = game.settings.get('nonex-ist-od6s','default_ranged_attack_difficulty');
    OD6S.baseMeleeAttackDifficulty = game.settings.get('nonex-ist-od6s','default_melee_attack_difficulty');
    OD6S.baseBrawlAttackDifficulty = game.settings.get('nonex-ist-od6s','default_brawl_attack_difficulty');
    OD6S.baseBrawlAttackDifficultyLevel = game.settings.get('nonex-ist-od6s','default_brawl_attack_difficulty_level');

    OD6S.trackStuns = game.settings.get('nonex-ist-od6s', 'track_stuns');

    OD6S.currencyName = game.settings.get('nonex-ist-od6s', 'customize_currency_label') ?
        game.settings.get('nonex-ist-od6s', 'customize_currency_label') : game.i18n.localize('NONEX_IST_OD6S.CHAR_CREDITS');

    if (game.settings.get('nonex-ist-od6s', 'default_difficulty_very_easy'))
        OD6S.difficulty["NONEX_IST_OD6S.DIFFICULTY_VERY_EASY"].max = game.settings.get('nonex-ist-od6s', 'default_difficulty_very_easy')

    if (game.settings.get('nonex-ist-od6s', 'default_difficulty_easy'))
        OD6S.difficulty["NONEX_IST_OD6S.DIFFICULTY_EASY"].max = game.settings.get('nonex-ist-od6s', 'default_difficulty_easy');

    if (game.settings.get('nonex-ist-od6s', 'default_difficulty_moderate'))
        OD6S.difficulty["NONEX_IST_OD6S.DIFFICULTY_MODERATE"].max = game.settings.get('nonex-ist-od6s', 'default_difficulty_moderate');

    if (game.settings.get('nonex-ist-od6s', 'default_difficulty_difficult'))
        OD6S.difficulty["NONEX_IST_OD6S.DIFFICULTY_DIFFICULT"].max = game.settings.get('nonex-ist-od6s', 'default_difficulty_difficult');

    if (game.settings.get('nonex-ist-od6s', 'default_difficulty_very_difficult'))
        OD6S.difficulty["NONEX_IST_OD6S.DIFFICULTY_VERY_DIFFICULT"].max = game.settings.get('nonex-ist-od6s', 'default_difficulty_very_difficult');

    if (game.settings.get('nonex-ist-od6s', 'default_difficulty_heroic'))
        OD6S.difficulty["NONEX_IST_OD6S.DIFFICULTY_HEROIC"].max = game.settings.get('nonex-ist-od6s', 'default_difficulty_heroic');

    if (game.settings.get('nonex-ist-od6s', 'default_difficulty_legendary'))
        OD6S.difficulty["NONEX_IST_OD6S.DIFFICULTY_LEGENDARY"].max = game.settings.get('nonex-ist-od6s', 'default_difficulty_legendary');

    if (game.settings.get('nonex-ist-od6s', 'parry_skills')) {
        OD6S.actions.parry.skill = "NONEX_IST_OD6S.MELEE_PARRY";
        OD6S.actions.block.skill = "NONEX_IST_OD6S.BRAWLING_PARRY";
        OD6S.actions.block.name = "NONEX_IST_OD6S.BRAWLING_PARRY";
    } else {
        OD6S.actions.parry.skill = "NONEX_IST_OD6S.MELEE_COMBAT";
        OD6S.actions.block.skill = "NONEX_IST_OD6S.BRAWL";
        OD6S.actions.block.name = "NONEX_IST_OD6S.ACTION_BRAWL_BLOCK"
    }

    OD6S.difficulty['NONEX_IST_OD6S.DIFFICULTY_VERY_EASY'].dice = game.settings.get('nonex-ist-od6s','random_dice_difficulty_very_easy');
    OD6S.difficulty['NONEX_IST_OD6S.DIFFICULTY_EASY'].dice = game.settings.get('nonex-ist-od6s','random_dice_difficulty_easy');
    OD6S.difficulty['NONEX_IST_OD6S.DIFFICULTY_MODERATE'].dice = game.settings.get('nonex-ist-od6s','random_dice_difficulty_moderate');
    OD6S.difficulty['NONEX_IST_OD6S.DIFFICULTY_DIFFICULT'].dice = game.settings.get('nonex-ist-od6s','random_dice_difficulty_difficult');
    OD6S.difficulty['NONEX_IST_OD6S.DIFFICULTY_VERY_DIFFICULT'].dice = game.settings.get('nonex-ist-od6s','random_dice_difficulty_very_difficult');
    OD6S.difficulty['NONEX_IST_OD6S.DIFFICULTY_HEROIC'].dice = game.settings.get('nonex-ist-od6s','random_dice_difficulty_heroic');
    OD6S.difficulty['NONEX_IST_OD6S.DIFFICULTY_LEGENDARY'].dice = game.settings.get('nonex-ist-od6s','random_dice_difficulty_legendary');

    OD6S.fatePointRound = game.settings.get('nonex-ist-od6s', 'fate_point_round');
    OD6S.fatePointClimactic = game.settings.get('nonex-ist-od6s', 'fate_point_climactic');

    OD6S.woundConfig = game.settings.get('nonex-ist-od6s', 'bodypoints');

    OD6S.highHitDamage = game.settings.get('nonex-ist-od6s', 'highhitdamage');

    OD6S.weaponArmorDamage = game.settings.get('nonex-ist-od6s', 'weapon_armor_damage');

    OD6S.autoOpposed = game.settings.get('nonex-ist-od6s', 'auto_opposed');

    OD6S.autoPromptPlayerResistance = game.settings.get('nonex-ist-od6s','auto_prompt_player_resistance');

    OD6S.autoSkillUsed = game.settings.get('nonex-ist-od6s', 'auto_skill_used');

    OD6S.autoExplosive = game.settings.get('nonex-ist-od6s','auto_explosive');

    OD6S.hideExplosiveTemplates = game.settings.get('nonex-ist-od6s', 'hide_explosive_templates');

    OD6S.cost = game.settings.get('nonex-ist-od6s', 'cost');
    OD6S.fundsFate = game.settings.get('nonex-ist-od6s', 'funds_fate');

    OD6S.opposed = [];

    OD6S.pipsPerDice = game.settings.get('nonex-ist-od6s', 'pip_per_dice');

    OD6S.deadlinessLevel['character'] = game.settings.get('nonex-ist-od6s', 'deadliness');
    OD6S.deadlinessLevel['npc'] = game.settings.get('nonex-ist-od6s', 'npc-deadliness');
    OD6S.deadlinessLevel['creature'] = game.settings.get('nonex-ist-od6s', 'creature-deadliness');

    OD6S.stunScaling = game.settings.get('nonex-ist-od6s', 'scale-stun');
    //OD6S.woundScaling = game.settings.get('nonex-ist-od6s', 'scale-wounds');

    OD6S.flatSkills = game.settings.get('nonex-ist-od6s', 'flat_skills');

    OD6S.specLink = game.settings.get('nonex-ist-od6s', 'spec_link');

    OD6S.skillUsed = game.settings.get('nonex-ist-od6s', 'skill_used');

    OD6S.showSkillSpecialization = game.settings.get('nonex-ist-od6s', 'show_skill_specialization');

    OD6S.specializationDice = game.settings.get('nonex-ist-od6s', 'specialization_dice');

    OD6S.initialAttributes = game.settings.get('nonex-ist-od6s','initial_attributes');
    OD6S.initialSkills = game.settings.get('nonex-ist-od6s', 'initial_skills');
    OD6S.initialCharacterPoints = game.settings.get('nonex-ist-od6s', 'initial_character_points');
    OD6S.initialFatePoints = game.settings.get('nonex-ist-od6s', 'initial_fate_points');
    OD6S.initialMove = game.settings.get('nonex-ist-od6s','initial_move');

    if (game.settings.get('nonex-ist-od6s', 'customize_metaphysics_skill_channel'))
        OD6S.channelSkillName = game.settings.get('nonex-ist-od6s', 'customize_metaphysics_skill_channel');
    if (game.settings.get('nonex-ist-od6s', 'customize_metaphysics_skill_sense'))
        OD6S.senseSkillName = game.settings.get('nonex-ist-od6s', 'customize_metaphysics_skill_sense');
    if (game.settings.get('nonex-ist-od6s', 'customize_metaphysics_skill_transform'))
        OD6S.transformSkillName = game.settings.get('nonex-ist-od6s', 'customize_metaphysics_skill_transform');

    OD6S.initiative.reroll = game.settings.get('nonex-ist-od6s', 'reroll_initiative');
    if(game.settings.get('nonex-ist-od6s', 'reroll_initiative')) {
        OD6S.initiative.reroll_character = game.settings.get('nonex-ist-od6s', 'auto_reroll_character');
        OD6S.initiative.reroll_npc = game.settings.get('nonex-ist-od6s', 'auto_reroll_npc');
    } else {
        OD6S.initiative.reroll_character = false;
        OD6S.initiative.reroll_npc = false;
    }

    OD6S.initiative.attribute = game.settings.get('nonex-ist-od6s', 'initiative_attribute');

    OD6S.stunDamageIncrement = game.settings.get('nonex-ist-od6s','stun_damage_increment')

    // Rebuild the dynamic custom-attribute entries: drop everything that isn't
    // a core attribute, then re-add the slots after `met` in definition order.
    // Sourced from the schema-stable view, NOT the live setting — updateConfig
    // re-runs on every renderSettingsConfig, and the registry must keep
    // matching the schema baked at init or actor preparation crashes. Their
    // `active` flag lives on the definition (there is no per-slot
    // `customize_*_active` setting), so it is applied here and skipped in the
    // loop below.
    for (const key of Object.keys(OD6S.attributes)) {
        if (!CORE_ATTRIBUTE_KEYS.includes(key)) delete OD6S.attributes[key];
    }
    const metSort = OD6S.attributes.met.sort;
    getSchemaCustomAttributes().forEach((def, i) => {
        OD6S.attributes[def.id] = {
            name: def.name || game.i18n.localize('NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE'),
            shortName: def.short || def.name || game.i18n.localize('NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_SHORT'),
            active: def.active,
            sort: metSort + 1 + i,
        };
    });

    const attrSort = game.settings.get('nonex-ist-od6s','attributes_sorting');
    for (const attribute in OD6S.attributes) {
        const key = "customize_" + attribute + "_active";
        if (game.settings.settings.has(`nonex-ist-od6s.${key}`)) {
            OD6S.attributes[attribute].active = game.settings.get('nonex-ist-od6s', key);
        }
        if(typeof(attrSort[attribute]) !== "undefined") {
            OD6S.attributes[attribute].sort = attrSort[attribute].sort;
        }
    }
}
