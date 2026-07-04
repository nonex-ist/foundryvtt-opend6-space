import OD6S from "../config/config-od6s";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

const NS = "nonex-ist-od6s";

/**
 * Custom Fields menu — define up to four extra info fields (name, abbreviation,
 * data type, and which actor types show them). Each field is presented as a
 * self-contained card rather than a flat run of sixteen unrelated rows.
 *
 * Actor-type visibility is stored as a bitmask (`OD6S.actorMasks`); the card
 * renders a hidden input carrying the current mask plus one checkbox per actor
 * type, and #onSubmit rebuilds the mask from whichever boxes are ticked.
 */
export default class od6sCustomFieldsConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

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
            handler: od6sCustomFieldsConfiguration.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sCustomFieldsConfiguration.#onCloseForm,
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

        const fields = [1, 2, 3, 4].map((i) => {
            const mask = Number(game.settings.get(NS, `custom_field_${i}_actor_types`)) || 0;
            return {
                index: i,
                nameKey: `custom_field_${i}`,
                shortKey: `custom_field_${i}_short`,
                typeKey: `custom_field_${i}_type`,
                actorTypesKey: `custom_field_${i}_actor_types`,
                name: game.settings.get(NS, `custom_field_${i}`),
                short: game.settings.get(NS, `custom_field_${i}_short`),
                type: game.settings.get(NS, `custom_field_${i}_type`),
                mask,
                actors: actorTypes.map((t) => ({
                    type: t,
                    label: game.i18n.localize(`TYPES.Actor.${t}`),
                    checked: (mask & (1 << OD6S.actorMasks[t])) !== 0,
                })),
            };
        });

        return {fields, typeChoices};
    }

    static async #onSubmit(
        this: od6sCustomFieldsConfiguration,
        _event: Event,
        _form: HTMLFormElement,
        formData: {object: Record<string, unknown>},
    ): Promise<void> {
        const data = formData.object;
        for (const key in data) {
            if (key.endsWith("_actor_types")) {
                // The field submits a hidden current-mask value plus one entry per
                // ticked actor type; rebuild the mask from those.
                const raw = data[key];
                const arr = (Array.isArray(raw) ? raw : [raw]).map(String);
                let value = Number(arr[0]) || 0;
                for (const type in OD6S.actorMasks) {
                    value = od6sCustomFieldsConfiguration.#updateActorTypes(value, type, arr.includes(type));
                }
                if (Number(game.settings.get(NS, key)) === value) continue;
                await game.settings.set(NS, key, value as never);
            } else {
                if (game.settings.get(NS, key) === data[key]) continue;
                await game.settings.set(NS, key, data[key] as never);
            }
            const s = game.settings.settings.get(`${NS}.${key}`);
            if (s?.requiresReload) this.requiresWorldReload = true;
        }
    }

    static #updateActorTypes(value: number, type: string, on: boolean): number {
        const bit = 1 << OD6S.actorMasks[type];
        return on ? value | bit : value & ~bit;
    }

    static async #onCloseForm(this: od6sCustomFieldsConfiguration): Promise<void> {
        if (this.requiresWorldReload) {
            await foundry.applications.settings.SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
