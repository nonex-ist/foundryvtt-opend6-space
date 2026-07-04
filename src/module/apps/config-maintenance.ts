import {repairLegacyLabelKeys} from "../system/migration";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

/**
 * DM Maintenance tools. A GM-restricted settings menu for one-off world-repair
 * actions that normally run as automatic migrations but are useful to re-run by
 * hand — e.g. after importing legacy actors from an old-id world.
 *
 * The first tool, "Repair legacy labels" (#189), rewrites stored `OD6S.*` i18n
 * label keys to `NONEX_IST_OD6S.*` by delegating to the same idempotent
 * `repairLegacyLabelKeys()` the migration step uses. New tools slot in as extra
 * buttons + action handlers.
 */
export default class od6sMaintenanceConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {

    /** Guards against a second click while a repair is running. */
    #running = false;

    static DEFAULT_OPTIONS = {
        id: "nonex-ist-od6s-maintenance-configuration",
        classes: ["nonex-ist-od6s", "settings-config"],
        tag: "form",
        window: {
            title: "NONEX_IST_OD6S.CONFIG_MAINTENANCE_MENU",
            resizable: true,
            minimizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
        actions: {
            repairLabels: od6sMaintenanceConfiguration.#onRepairLabels,
            closeForm: od6sMaintenanceConfiguration.#onCloseForm,
        },
    };

    static PARTS = {
        form: {
            template: "systems/nonex-ist-od6s/templates/settings/maintenance.html",
        },
    };

    static async #onRepairLabels(this: od6sMaintenanceConfiguration): Promise<void> {
        if (this.#running) return;
        this.#running = true;
        try {
            const summary = await repairLegacyLabelKeys();
            if (summary.fields === 0) {
                ui.notifications.info(
                    game.i18n.localize("NONEX_IST_OD6S.MAINTENANCE_REPAIR_LABELS_NONE"),
                );
            } else {
                ui.notifications.info(
                    game.i18n.format("NONEX_IST_OD6S.MAINTENANCE_REPAIR_LABELS_RESULT", {
                        fields: summary.fields,
                        documents: summary.documents,
                    }),
                );
            }
        } catch (err) {
            console.error("nonex-ist-od6s | label repair failed", err);
            ui.notifications.error(
                game.i18n.localize("NONEX_IST_OD6S.MAINTENANCE_REPAIR_LABELS_ERROR"),
            );
        } finally {
            this.#running = false;
        }
    }

    static async #onCloseForm(this: od6sMaintenanceConfiguration): Promise<void> {
        await this.close();
    }
}
