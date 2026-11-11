const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

const NS = "nonex-ist-od6s";

/** Minimum shape shared by all slot definitions. */
export interface SlotDef {
    id: string;
}

/**
 * Shared behaviour for the Custom Fields and Custom Attributes menus (#199):
 * an editable list of slot definitions stored in one array-valued world
 * setting, with add/delete actions, live per-row saving, and a world-reload
 * prompt once the list has changed. Subclasses supply the setting key, the
 * delete-confirmation text, the current/new/merge row logic, and wire the
 * shared static handlers into their own DEFAULT_OPTIONS.
 *
 * Form rows are named `defs.<id>.<property>`, so a submit expands to
 * `{defs: {<id>: {…}}}` and merges onto the stored definitions by id.
 */
export default abstract class OD6SSlotListConfiguration<TDef extends SlotDef>
    extends HandlebarsApplicationMixin(ApplicationV2) {

    requiresWorldReload = false;

    /** World setting holding this menu's definition array. */
    protected abstract readonly settingKey: string;
    /** i18n key for the delete-confirmation body. */
    protected abstract readonly deleteConfirmKey: string;
    /** Current cleaned definitions from the setting. */
    protected abstract currentDefs(): TDef[];
    /** A blank definition with a fresh id, appended by the add action. */
    protected abstract newDef(existing: TDef[]): TDef;
    /** Apply one submitted form row onto a stored definition. */
    protected abstract mergeRow(def: TDef, row: Record<string, unknown>): TDef;

    /**
     * One sentence for the delete confirmation quantifying the real impact —
     * deleting a slot drops (or permanently orphans) per-actor data, so the
     * dialog must show how much data is actually at stake, not just warn in
     * the abstract.
     */
    protected abstract deleteImpact(id: string): string;

    protected async saveDefs(defs: TDef[]): Promise<void> {
        await game.settings.set(NS, this.settingKey, defs as never);
        this.requiresWorldReload = true;
    }

    /**
     * Count actors holding data for a slot: world actors plus unlinked token
     * actors (which carry their own `system` delta). Backs `deleteImpact`.
     */
    protected countAffectedActors(hasData: (actor: unknown) => boolean): number {
        let count = 0;
        for (const actor of game.actors) {
            if (hasData(actor)) count++;
        }
        for (const scene of game.scenes) {
            for (const token of scene.tokens) {
                if ((token as {actorLink?: boolean}).actorLink || !token.actor) continue;
                if (hasData(token.actor)) count++;
            }
        }
        return count;
    }

    protected static async onSubmitDefs(
        this: OD6SSlotListConfiguration<SlotDef>,
        _event: Event,
        _form: HTMLFormElement,
        formData: {object: Record<string, unknown>},
    ): Promise<void> {
        const submitted =
            (foundry.utils.expandObject(formData.object) as {defs?: Record<string, Record<string, unknown>>})
                .defs ?? {};
        const current = this.currentDefs();
        const defs = current.map((def) => {
            const row = submitted[def.id];
            return row ? this.mergeRow(def, row) : def;
        });
        // Both sides are built by the same mappers with identical key order,
        // so the stringify comparison is a stable no-change check.
        if (JSON.stringify(defs) === JSON.stringify(current)) return;
        await this.saveDefs(defs);
    }

    protected static async onAddSlot(this: OD6SSlotListConfiguration<SlotDef>): Promise<void> {
        const defs = this.currentDefs();
        defs.push(this.newDef(defs));
        await this.saveDefs(defs);
        this.render(false);
    }

    protected static async onDeleteSlot(
        this: OD6SSlotListConfiguration<SlotDef>,
        _event: Event,
        target: HTMLElement,
    ): Promise<void> {
        const id = target.dataset.id;
        if (!id) return;
        const ok = await foundry.applications.api.DialogV2.confirm({
            window: {title: game.i18n.localize("NONEX_IST_OD6S.DELETE")},
            content: `<p>${game.i18n.localize(this.deleteConfirmKey)}</p>`
                + `<p><strong>${this.deleteImpact(id)}</strong></p>`,
        });
        if (!ok) return;
        await this.saveDefs(this.currentDefs().filter((d) => d.id !== id));
        this.render(false);
    }

    protected static async onCloseForm(this: OD6SSlotListConfiguration<SlotDef>): Promise<void> {
        // The reload prompt lives in _onClose so it also covers the window
        // header's close control, not just this footer button.
        await this.close();
    }

    override _onClose(options?: object): void {
        super._onClose?.(options);
        if (this.requiresWorldReload) {
            this.requiresWorldReload = false;
            void foundry.applications.settings.SettingsConfig.reloadConfirm({world: true});
        }
    }
}
