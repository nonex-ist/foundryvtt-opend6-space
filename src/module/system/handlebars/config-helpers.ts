/**
 * Configuration getter Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";
import type { AttributeDef } from "../../config/attributes";
import {od6sutilities} from "../utilities";
import {getAttributeName, getAttributeShortName} from "../../macros";
import {getVisibleCustomFields} from "../../config/settings/custom-slots";

export function registerConfigHelpers() {
    Handlebars.registerHelper('getConfig', function (key, subKey) {
        const value = OD6S[key];
        if (typeof subKey !== 'undefined' && subKey !== '') {
            return (value as Record<string, unknown>)[subKey];
        }
        return value;
    })

    Handlebars.registerHelper('getSystemConfig', function (config) {
        return game.settings.get('nonex-ist-od6s', config);
    })

    // Header fields defined in the `custom_fields` setting, filtered to those
    // visible on the given actor type. Each entry carries the display label and
    // input/dtype attributes, so the header templates just loop the result.
    Handlebars.registerHelper('getCustomFields', function (actorType) {
        return getVisibleCustomFields(actorType);
    })

    Handlebars.registerHelper('getMetaphysicsName', function () {
        return getAttributeName('met');
    })

    Handlebars.registerHelper('getManifestationsName', function () {
        return game.i18n.localize(OD6S.manifestationsName);
    })

    Handlebars.registerHelper('getFatePointsName', function () {
        return game.i18n.localize(OD6S.fatePointsName);
    })

    Handlebars.registerHelper('getFatePointsShortName', function () {
        return game.i18n.localize(OD6S.fatePointsShortName);
    })

    Handlebars.registerHelper('getMetaphysicsExtranormalName', function () {
        return game.i18n.localize(OD6S.metaphysicsExtranormalName);
    })

    Handlebars.registerHelper('getAttributeName', function (attribute) {
        return getAttributeName(attribute);
    })

    Handlebars.registerHelper('getAttributeShortName', function (attribute) {
        return getAttributeShortName(attribute);
    })

    Handlebars.registerHelper('getAttributes', function () {
        const active: Record<string, AttributeDef> = {};
        for (const attribute in OD6S.attributes) {
            if (OD6S.attributes[attribute].active) active[attribute] = OD6S.attributes[attribute];
        }
        return active;
    })

    Handlebars.registerHelper('isAttributeActive', function (key) {
        return OD6S.attributes[key].active;
    });

    Handlebars.registerHelper('getActiveAttributes', function (attributes) {
        const active: Record<string, OD6SAttributeField> = {};
        for (const attr in attributes) {
            if(attributes[attr].active) {
                active[attr] = attributes[attr];
            }
        }
        return active;
    })

    Handlebars.registerHelper('isMetaphysicsAttributeOptional', function () {
        return game.settings.get('nonex-ist-od6s', 'metaphysics_attribute_optional');
    })

    Handlebars.registerHelper('showMetaphysics', function (sheetMode) {
        if (game.settings.get('nonex-ist-od6s', 'metaphysics_attribute_optional')) return false;
        if (!OD6S.attributes['met'].active) return false;

        if (sheetMode === 'normal') {
            return !!game.settings.get('nonex-ist-od6s', 'show_metaphysics_attributes');
        }

        return true;
    })

    Handlebars.registerHelper('getCurrencyLabel', function () {
        return OD6S.currencyName;
    })

    Handlebars.registerHelper('getUseFatePoint', function () {
        return game.i18n.localize(OD6S.useAFatePointName);
    })

    Handlebars.registerHelper('showDifficulty', function () {
        return game.settings.get('nonex-ist-od6s', 'show-roll-difficulty');
    })

    Handlebars.registerHelper('showModifiers', function () {
        return game.settings.get('nonex-ist-od6s', 'roll-modifiers');
    })

    Handlebars.registerHelper('isHideAllRolls', function () {
        return !game.settings.get('nonex-ist-od6s', 'roll-modifiers');
    })

    Handlebars.registerHelper('showWildDie', function () {
        return game.settings.get('nonex-ist-od6s', 'use_wild_die');
    })

    Handlebars.registerHelper('getWildDieDefault', function (key) {
        return OD6S.wildDieResult[OD6S.wildDieOneDefault] === key;
    })

    Handlebars.registerHelper('getActorTypeConfig', function (value, type) {
        return ((value >> OD6S.actorMasks[type]) % 2 !== 0);
    })

    Handlebars.registerHelper('getActorTypeLabel', (type) => {
        return OD6S.actorTypeLabels[type];
    })

    Handlebars.registerHelper('getCost', function () {
        return OD6S.cost;
    })

    Handlebars.registerHelper('getPrices', function () {
        return OD6S.difficultyShort;
    })

    Handlebars.registerHelper('hideAdvantagesDisadvantages', function () {
        return game.settings.get('nonex-ist-od6s', 'hide_advantages_disadvantages');
    });

    Handlebars.registerHelper('templateItemTypes', function (type, actorTypes) {
        const itemTypes: Record<string, { label: string }> = {};
        let templateItems = [];

        // Item group, filter by actor types
        if (type === "item-group") {
            for (const [key, items] of Object.entries(OD6S.allowedItemTypes)) {
                if (actorTypes.includes(key)) {
                    for (const i of items) {
                        if (OD6S.templateItemTypes['item-group'].includes(i)) {
                            templateItems.push(i);
                        }
                    }
                }
            }
        } else {
            templateItems = OD6S.templateItemTypes[type];
        }
        // Remove advantages and disadvantages if hidden
        if (game.settings.get('nonex-ist-od6s', 'hide_advantages_disadvantages')) {
            templateItems = templateItems.filter((t: any) => t !== 'advantage' || t !== 'disadvantage');
        }

        for (const e of templateItems) {
            const model = CONFIG.Item.dataModels[e];
            const defaultData = model ? model.defineSchema() : {};
            const label = (e === 'manifestation') ? OD6S.manifestationsName :
                (defaultData.label?.initial ?? e);
            itemTypes[e] = { label };
        }
        return itemTypes;
    })

    Handlebars.registerHelper('getCharacterTemplates', function () {
        return od6sutilities.getAllItemsByType('character-template');
    })
}
