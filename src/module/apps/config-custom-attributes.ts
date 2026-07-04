const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

const NS = "nonex-ist-od6s";

/**
 * Custom Attributes menu — one home for the four user-defined, die-rollable
 * attributes (CA1–CA4). Each row sets the attribute's name, abbreviation, and
 * whether it's active. Previously the names lived in Custom Labels and the
 * active toggles in Active Attributes; this consolidates them so a GM configures
 * a custom attribute in a single place. (Ordering still lives in the shared
 * Attribute Sorting menu, alongside the built-in attributes.)
 *
 * Settings are read/written by key so the four rows can be laid out as a grid;
 * they carry the `od6sCustomAttribute` marker only to keep them out of the other
 * menus' filtered lists.
 */
export default class od6sCustomAttributesConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

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
            handler: od6sCustomAttributesConfiguration.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sCustomAttributesConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/settings/custom-attributes.html",
        },
    };

    async _prepareContext(_options?: object): Promise<object> {
        const P = "NONEX_IST_OD6S.";
        const rows = [1, 2, 3, 4].map((i) => {
            const n = String(i).padStart(2, "0");
            return {
                index: i,
                nameKey: `customize_ca${i}_name`,
                shortKey: `customize_ca${i}_name_short`,
                activeKey: `customize_ca${i}_active`,
                name: game.settings.get(NS, `customize_ca${i}_name`),
                short: game.settings.get(NS, `customize_ca${i}_name_short`),
                active: game.settings.get(NS, `customize_ca${i}_active`),
                namePlaceholder: game.i18n.localize(`${P}CHAR_CUSTOM_ATTRIBUTE_${n}`),
                shortPlaceholder: game.i18n.localize(`${P}CHAR_CUSTOM_ATTRIBUTE_${n}_SHORT`),
            };
        });
        return {rows};
    }

    static async #onSubmit(
        this: od6sCustomAttributesConfiguration,
        _event: Event,
        _form: HTMLFormElement,
        formData: {object: Record<string, unknown>},
    ): Promise<void> {
        const data = formData.object;
        for (const key in data) {
            if (game.settings.get(NS, key) === data[key]) continue;
            await game.settings.set(NS, key, data[key] as never);
            const s = game.settings.settings.get(`${NS}.${key}`);
            if (s?.requiresReload) this.requiresWorldReload = true;
        }
    }

    static async #onCloseForm(this: od6sCustomAttributesConfiguration): Promise<void> {
        if (this.requiresWorldReload) {
            await foundry.applications.settings.SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
