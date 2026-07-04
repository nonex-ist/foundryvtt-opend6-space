const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

const NS = "nonex-ist-od6s";

/**
 * Shared base for the system's list-style settings submenus (Automation, Rules,
 * Custom Labels, Reveal, …). Each of those panels is the same form: collect the
 * settings tagged with one category marker and render them as label / control /
 * hint rows. Instead of copy-pasting that logic into every app, they extend this
 * base and declare only what differs:
 *
 *   export default class od6sAutomationConfiguration extends OD6SSettingsMenu {
 *       static SETTINGS_CATEGORY = "od6sAutomation";
 *       static DEFAULT_OPTIONS = {
 *           id: "nonex-ist-od6s-automation-configuration",
 *           window: {title: "NONEX_IST_OD6S.CONFIG_AUTOMATION_OPTIONS_MENU"},
 *       };
 *   }
 *
 * The base owns the shared template, live-saving of changed values, the reload
 * prompt, and placeholder defaults — so every panel looks and behaves the same.
 * Panels with bespoke UI (drag-sort, colour pickers, custom widgets) keep their
 * own class but should mirror the same window classes, `.form-group`/`.notes`
 * markup, and Close button for visual consistency.
 */
export default class OD6SSettingsMenu extends HandlebarsApplicationMixin(ApplicationV2) {

    /** Settings marker (e.g. "od6sAutomation") this menu collects. Subclass sets it. */
    static SETTINGS_CATEGORY = "";

    requiresWorldReload = false;

    // Typed as ApplicationV2Options (all-optional) so subclasses can override
    // with just the id + window title they need.
    static DEFAULT_OPTIONS: ApplicationV2Options = {
        classes: ["nonex-ist-od6s", "settings-config"],
        tag: "form",
        window: {
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: OD6SSettingsMenu.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: OD6SSettingsMenu.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/settings/settings-v2.html",
        },
    };

    /**
     * Optional `settingKey → i18n key` map whose localized value is shown as an
     * input placeholder (the built-in default a blank field falls back to).
     * Defaults to none; override in subclasses that have text defaults.
     */
    protected placeholderKeys(): Record<string, string> {
        return {};
    }

    /**
     * Optional section grouping. Return an ordered list of `{label, keys}` to
     * render the panel as labelled `<fieldset>` sections (like the Appearance
     * menu); any settings not listed fall into a trailing unlabelled section.
     * Return `null` (the default) for a flat, ungrouped list.
     */
    protected settingGroups(): Array<{label: string; keys: string[]}> | null {
        return null;
    }

    async _prepareContext(_options?: object): Promise<object> {
        const category = (this.constructor as typeof OD6SSettingsMenu).SETTINGS_CATEGORY;
        const settings = Array.from(game.settings.settings)
            .filter((s: any) => s[1][category])
            .map((s: any) => s[1]);

        const placeholders = this.placeholderKeys();
        for (const s of settings) {
            s.inputType = s.type === Boolean ? "checkbox" : "text";
            s.choice = typeof s.choices !== "undefined";
            s.value = game.settings.get(s.namespace, s.key);
            const dk = placeholders[s.key];
            s.placeholder = dk && game.i18n.has(dk) ? game.i18n.localize(dk) : "";
        }

        return {groups: this.#groupSettings(settings)};
    }

    /** Bucket settings into `{label, settings}` sections per `settingGroups()`. */
    #groupSettings(settings: any[]): Array<{label: string | null; settings: any[]}> {
        const defs = this.settingGroups();
        if (!defs) return [{label: null, settings}];

        const byKey = new Map(settings.map((s) => [s.key, s]));
        const used = new Set<string>();
        const groups: Array<{label: string | null; settings: any[]}> = [];
        for (const def of defs) {
            const picked = def.keys.map((k) => byKey.get(k)).filter(Boolean);
            picked.forEach((s) => used.add(s.key));
            if (picked.length) groups.push({label: game.i18n.localize(def.label), settings: picked});
        }
        const rest = settings.filter((s) => !used.has(s.key));
        if (rest.length) groups.push({label: null, settings: rest});
        return groups;
    }

    static async #onSubmit(
        this: OD6SSettingsMenu,
        _event: Event,
        _form: HTMLFormElement,
        formData: {object: Record<string, unknown>},
    ): Promise<void> {
        const data = formData.object;
        for (const key in data) {
            // Only write changed values so an unrelated edit can't force a
            // reload prompt for a setting the GM never touched.
            if (game.settings.get(NS, key) === data[key]) continue;
            await game.settings.set(NS, key, data[key] as never);
            const s = game.settings.settings.get(`${NS}.${key}`);
            if (s?.requiresReload) this.requiresWorldReload = true;
        }
    }

    static async #onCloseForm(this: OD6SSettingsMenu): Promise<void> {
        if (this.requiresWorldReload) {
            await foundry.applications.settings.SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
