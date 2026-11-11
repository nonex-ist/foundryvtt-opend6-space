import OD6S from "../config/config-od6s";
import {rebuildActorMask} from "./custom-field-mask";
import OD6SSlotListConfiguration from "./config-slot-list";
import {getConfiguredCustomFields} from "../config/settings/custom-slots";
import type {CustomFieldDef} from "../system/custom-slots";
import { freshSlotId, LEGACY_FIELD_ID_PREFIX} from "../system/custom-slots";

/**
 * Custom Fields menu — define any number of extra header fields (name,
 * abbreviation, data type, and which actor types show them). Definitions live
 * in the array-valued `custom_fields` world setting (#199); each card edits one
 * entry, and cards can be added or removed freely. Per-actor values are stored
 * under `system.customfields.<id>`, so deleting a card orphans (but does not
 * destroy) any values already entered for it.
 *
 * Actor-type visibility is stored as a bitmask (`OD6S.actorMasks`); the card
 * renders a hidden input carrying the current mask plus one checkbox per actor
 * type, and the submit handler rebuilds the mask from whichever boxes are
 * ticked. List handling (add/delete/save/reload prompt) comes from
 * `OD6SSlotListConfiguration`.
 */
export default class od6sCustomFieldsConfiguration extends OD6SSlotListConfiguration<CustomFieldDef> {

    protected readonly settingKey = "custom_fields";
    protected readonly deleteConfirmKey = "NONEX_IST_OD6S.CONFIG_CF_DELETE_CONFIRM";

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-custom-fields-configuration",
        classes: ["nonex-ist-od6s", "settings-config"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.CONFIG_CUSTOM_FIELDS",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: od6sCustomFieldsConfiguration.onSubmitDefs,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sCustomFieldsConfiguration.onCloseForm,
            addField: od6sCustomFieldsConfiguration.onAddSlot,
            deleteField: od6sCustomFieldsConfiguration.onDeleteSlot,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/settings/custom-fields.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        const actorTypes = Object.keys(OD6S.actorMasks);
        const typeChoices = {
            number: game.i18n.localize("NONEX_IST_OD6S.NUMBER"),
            string: game.i18n.localize("NONEX_IST_OD6S.STRING"),
        };

        const fields = this.currentDefs().map((def, i) => ({
            ...def,
            index: i + 1,
            actors: actorTypes.map((t) => ({
                type: t,
                label: game.i18n.localize(`TYPES.Actor.${t}`),
                checked: (def.actorTypes & (1 << OD6S.actorMasks[t])) !== 0,
            })),
        }));

        return {fields, typeChoices};
    }

    protected currentDefs(): CustomFieldDef[] {
        return getConfiguredCustomFields();
    }

    protected newDef(existing: CustomFieldDef[]): CustomFieldDef {
        return {
            id: freshSlotId(existing, LEGACY_FIELD_ID_PREFIX, () => foundry.utils.randomID(8)),
            name: "",
            short: "",
            type: "string",
            // Default matches the legacy slots: visible on characters only.
            actorTypes: 1 << OD6S.actorMasks.character,
        };
    }

    protected deleteImpact(id: string): string {
        const count = this.countAffectedActors((actor) => {
            const value = (actor as {system?: {customfields?: Record<string, unknown>}})
                .system?.customfields?.[id];
            return typeof value !== "undefined" && value !== "";
        });
        return game.i18n.format("NONEX_IST_OD6S.CONFIG_CF_DELETE_IMPACT", {count});
    }

    protected mergeRow(def: CustomFieldDef, row: Record<string, unknown>): CustomFieldDef {
        return {
            id: def.id,
            name: String(row.name ?? def.name),
            short: String(row.short ?? def.short),
            type: row.type === "number" ? "number" : "string",
            // The row submits a hidden current-mask value plus one entry per
            // ticked actor type; rebuild the mask from those.
            actorTypes: rebuildActorMask(row.actorTypes, OD6S.actorMasks),
        };
    }
}
