import OD6SSlotListConfiguration from "./config-slot-list";
import {getConfiguredCustomAttributes} from "../config/settings/custom-slots";
import type {CustomAttributeDef} from "../system/custom-slots";
import { freshSlotId, LEGACY_ATTRIBUTE_ID_PREFIX} from "../system/custom-slots";

/**
 * Custom Attributes menu — one home for the world-defined, die-rollable
 * attributes. Definitions live in the array-valued `custom_attributes` world
 * setting (#199); each row sets an attribute's name, abbreviation, and whether
 * it's active, and rows can be added or removed freely. Custom attributes
 * become real schema fields at init, so every change here needs a world
 * reload, and deleting a row drops that attribute's per-actor scores the next
 * time each actor is saved. (Ordering still lives in the shared Attribute
 * Sorting menu, alongside the built-in attributes.) List handling
 * (add/delete/save/reload prompt) comes from `OD6SSlotListConfiguration`.
 */
export default class od6sCustomAttributesConfiguration extends OD6SSlotListConfiguration<CustomAttributeDef> {

    protected readonly settingKey = "custom_attributes";
    protected readonly deleteConfirmKey = "NONEX_IST_OD6S.CONFIG_CA_DELETE_CONFIRM";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-custom-attributes-configuration",
        classes: ["nonex-ist-od6s", "settings-config"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.CONFIG_CUSTOM_ATTRIBUTES_MENU",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: od6sCustomAttributesConfiguration.onSubmitDefs,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sCustomAttributesConfiguration.onCloseForm,
            addAttribute: od6sCustomAttributesConfiguration.onAddSlot,
            deleteAttribute: od6sCustomAttributesConfiguration.onDeleteSlot,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/settings/custom-attributes.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        const rows = this.currentDefs().map((def, i) => ({
            ...def,
            index: i + 1,
            namePlaceholder: game.i18n.localize("NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE"),
            shortPlaceholder: game.i18n.localize("NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_SHORT"),
        }));
        return {rows};
    }

    protected currentDefs(): CustomAttributeDef[] {
        return getConfiguredCustomAttributes();
    }

    protected newDef(existing: CustomAttributeDef[]): CustomAttributeDef {
        return {
            id: freshSlotId(existing, LEGACY_ATTRIBUTE_ID_PREFIX, () => foundry.utils.randomID(8)),
            name: "",
            short: "",
            active: false,
        };
    }

    protected deleteImpact(id: string): string {
        const count = this.countAffectedActors((actor) => {
            const attr = (actor as {system?: {attributes?: Record<string, {base?: number; score?: number}>}})
                .system?.attributes?.[id];
            return !!attr && (Number(attr.base) !== 0 || Number(attr.score) !== 0);
        });
        return game.i18n.format("NONEX_IST_OD6S.CONFIG_CA_DELETE_IMPACT", {count});
    }

    protected mergeRow(def: CustomAttributeDef, row: Record<string, unknown>): CustomAttributeDef {
        return {
            id: def.id,
            name: String(row.name ?? def.name),
            short: String(row.short ?? def.short),
            active: row.active === true,
        };
    }
}
