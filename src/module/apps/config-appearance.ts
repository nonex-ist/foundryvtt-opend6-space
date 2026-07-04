const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

interface AppearanceSetting {
    key: string;
    name: string;
    hint: string;
    value: unknown;
    widget: "checkbox" | "range" | "color" | "text";
    range?: {min: number; max: number; step: number};
}

/**
 * Appearance settings menu — collects the display/sheet and chat-colour
 * preferences that used to sit loose in the main settings tab (#settings
 * grouping) into one dialog, so the system's settings category shows tidy
 * menu buttons instead of a scatter of toggles.
 *
 * Settings opt in with `od6sAppearance: true` (+ `config: false`). The form
 * renders each by an inferred widget — checkbox, range slider, colour picker,
 * or text — and splits chat-colour keys into their own labelled section.
 */
export default class od6sAppearanceConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-appearance-configuration",
        classes: ["nonex-ist-od6s", "settings-config"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.CONFIG_APPEARANCE_MENU",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        form: {
            handler: od6sAppearanceConfiguration.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            closeForm: od6sAppearanceConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/settings/appearance.html",
        },
    };

    #widgetFor(setting: any): AppearanceSetting["widget"] {
        if (setting.type === Boolean) return "checkbox";
        if (setting.range) return "range";
        if (typeof setting.key === "string" && setting.key.startsWith("chat_color_")) return "color";
        return "text";
    }

    async _prepareContext(_options?: object): Promise<object> {
        // Players see only their own client-scoped prefs (chat colours, sheet
        // opacity, …); world-scoped display toggles stay GM-only.
        const isGM = game.user.isGM;
        const raw = Array.from(game.settings.settings)
            .filter((s: any) => s[1].od6sAppearance)
            .map((s: any) => s[1])
            .filter((s: any) => s.scope === "client" || isGM);

        const display: AppearanceSetting[] = [];
        const chat: AppearanceSetting[] = [];
        for (const s of raw) {
            const entry: AppearanceSetting = {
                key: s.key,
                name: s.name,
                hint: s.hint,
                value: game.settings.get(s.namespace, s.key),
                widget: this.#widgetFor(s),
                range: s.range,
            };
            (String(s.key).startsWith("chat_") ? chat : display).push(entry);
        }

        return {display, chat};
    }

    _onRender(_context: object, _options: object): void {
        // Live-update the value label next to each range slider.
        this.element.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) => {
            const label = input.parentElement?.querySelector<HTMLElement>(".range-value");
            if (label) input.addEventListener("input", () => (label.textContent = input.value));
        });
    }

    static async #onSubmit(
        this: od6sAppearanceConfiguration,
        _event: Event,
        _form: HTMLFormElement,
        formData: any,
    ): Promise<void> {
        const data = formData.object;
        for (const key in data) {
            // Only write changed values so an unrelated edit can't force a
            // reload prompt for a setting the GM never touched.
            if (game.settings.get("nonex-ist-od6s", key) === data[key]) continue;
            await game.settings.set("nonex-ist-od6s", key, data[key]);
            const s = game.settings.settings.get(`nonex-ist-od6s.${key}`);
            if (s?.requiresReload) this.requiresWorldReload = true;
        }
    }

    static async #onCloseForm(this: od6sAppearanceConfiguration): Promise<void> {
        if (this.requiresWorldReload) {
            await foundry.applications.settings.SettingsConfig.reloadConfirm({world: true});
        }
        await this.close();
    }
}
