import {RollDialog} from "./roll-dialog";
import {setupRollData} from "./roll-helpers/roll-setup";
import {executeRollAction} from "./roll-helpers/roll-execute";
import {isVehicleActor, isActionItem} from "../system/type-guards";
import {getDifficulty, applyDifficultyEffects, applyDamageEffects} from "./roll-helpers/roll-difficulty";
import {getEffectMod, getRange, cancelAction} from "./roll-helpers/roll-effects";
import {detectSensorAction} from "./roll-helpers/roll-defense";
import type {RollData, IncomingRollData} from "./roll-helpers/roll-data";

export class od6sroll {

    rollData: RollData | undefined;
    static rollData: RollData | undefined;

    async _onRollItem(event: Event) {
        const actor = (this as any).actor as Actor;
        const item = actor.items.find((i: Item) => i.id === (event.currentTarget as HTMLElement).dataset.itemId);
        if (!item) return;
        if (isVehicleActor(actor) && actor.system.embedded_pilot?.value) {
            return item.roll();
        }
        if (isActionItem(item) && item.system.subtype?.includes("vehicle")) {
            const sys = item.system;
            if (sys.subtype === 'vehiclerangedweaponattack') {
                return actor.rollAction(sys.itemId);
            } else if (sys.subtype === 'vehiclesensors') {
                if (game.settings.get('nonex-ist-od6s', 'sensors')) {
                    const sensorAction = detectSensorAction(item.name, {
                        passive: game.i18n.localize('NONEX_IST_OD6S.SENSORS_PASSIVE'),
                        scan: game.i18n.localize('NONEX_IST_OD6S.SENSORS_SCAN'),
                        search: game.i18n.localize('NONEX_IST_OD6S.SENSORS_SEARCH'),
                        focus: game.i18n.localize('NONEX_IST_OD6S.SENSORS_FOCUS'),
                    });
                    if (sensorAction) return actor.rollAction(sensorAction);
                }
            } else {
                return actor.rollAction(sys.subtype);
            }
        } else {
            return item.roll();
        }
    }

    async _onRollEvent(event: Event) {
        event.preventDefault();
        const dataset = (event.currentTarget as HTMLElement).dataset;

        let score: number = 0;
        if (typeof dataset.score === "string") {
            const parsed = parseInt(dataset.score.replace(/['"]+/g, ''));
            score = isNaN(parsed) ? 0 : parsed;
        }

        const eventData: IncomingRollData = {
            name: dataset.label as string,
            score,
            type: dataset.type as string,
            actor: (this as any).actor as Actor,
            token: dataset.token,
            itemId: dataset.itemId ?? "",
            subtype: dataset.subtype,
        };

        await od6sroll._onRollDialog(eventData);
    }

    static async _onRollDialog(data: IncomingRollData) {
        const result = await setupRollData(data);
        if (result === false || result === undefined) return;

        // Each dialog owns its own RollData; the id is stable, so a still-open
        // previous dialog is closed first (its close handler cancels *its*
        // roll via its own data, e.g. removing an explosive's Region).
        await RollDialog.closeCurrent();

        // Compatibility: most recent roll data (nothing in src/module reads it).
        od6sroll.rollData = result;

        const dialog = new RollDialog(result, () => { void executeRollAction(result); });
        RollDialog.current = dialog;
        void dialog.render({force: true});
    }

    static async cancelAction(rollData: RollData | undefined = od6sroll.rollData) {
        if (rollData) await cancelAction(rollData);
    }

    static async rollAction(rollData: RollData | undefined = od6sroll.rollData) {
        return await executeRollAction(rollData as RollData);
    }

    static async getDifficulty(rollData: RollData) {
        return await getDifficulty(rollData);
    }

    static applyDifficultyEffects(rollData: RollData) {
        return applyDifficultyEffects(rollData);
    }

    static applyDamageEffects(rollData: RollData) {
        return applyDamageEffects(rollData);
    }

    static getEffectMod(type: string, name: string, actor: Actor) {
        return getEffectMod(type, name, actor);
    }

    static getRange(value: string, actor: Actor) {
        return getRange(value, actor);
    }
}
