import {od6sutilities} from "../system/utilities";
import {InitRollDialog} from "./init-roll-dialog";
import {MESSAGE_MODES} from "../hooks/chat-mode";

export class od6sInitRoll {

    rollData: any;

    activateListeners(html: any) {
        // @ts-expect-error super reference in mixin-style class
        super.activateListeners(html);
    }

    static async _onInitRollDialog(combat: any, combatant: any) {
        const combatantId = combatant.id;
        const actor = combatant.actor;
        const actorData = actor.system;
        const initScore = actorData.initiative.score + actor.system.roll_mod;
        const dice = od6sutilities.getDiceFromScore(initScore).dice;
        const pips = od6sutilities.getDiceFromScore(initScore).pips;
        // @ts-expect-error
        this.rollData = {
            label: game.i18n.localize('NONEX_IST_OD6S.INITIATIVE'),
            title: game.i18n.localize('NONEX_IST_OD6S.INITIATIVE'),
            dice: dice,
            pips: pips,
            wilddie: game.settings.get('nonex-ist-od6s', 'use_wild_die'),
            showWildDie: game.settings.get('nonex-ist-od6s', 'use_wild_die'),
            characterpoints: 0,
            cpcost: 0,
            cpcostcolor: "black",
            bonusdice: 0,
            bonuspips: 0,
            actor: actor,
            combat: combat,
            combatantId: combatantId,
            template: "systems/nonex-ist-od6s/templates/initRoll.html"
        }

        const caller = this as unknown as od6sInitRoll;
        new InitRollDialog(
            caller.rollData,
            () => od6sInitRoll.initRollAction(caller),
        ).render({force: true});
    }

    static async initRollAction(caller: any) {
        let rollString;
        let cpString;
        const rollData = caller.rollData;

        // Wild die explodes on a 6
        if (rollData.wilddie) {
            rollData.dice = (+rollData.dice) - 1;
            rollString = rollData.dice;
            rollString += "d6" + game.i18n.localize("NONEX_IST_OD6S.BASE_DIE_FLAVOR") + "+1dw" +
                game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR");
        } else {
            rollString = rollData.dice + "d6" + game.i18n.localize("NONEX_IST_OD6S.BASE_DIE_FLAVOR");
        }

        if (rollData.pips > 0) {
            rollString += "+" + rollData.pips;
        }

        // Character point dice also explode on a 6
        if (rollData.characterpoints > 0) {
            cpString = "+" + rollData.characterpoints + "db" +
                game.i18n.localize("NONEX_IST_OD6S.CHARACTER_POINT_DIE_FLAVOR");
            rollString += cpString;
        }

        // Bonus pips are not calculated to add new dice, just a bonus
        if (rollData.bonusdice > 0) {
            rollString += "+" + rollData.bonusdice + "d6" + game.i18n.localize("NONEX_IST_OD6S.BONUS_DIE_FLAVOR")
        }
        if (rollData.bonuspips > 0) {
            rollString += "+" + rollData.bonuspips;
        }

        // Add fraction of AGI and mods to break ties
        const fraction = ((+rollData.actor.system.attributes.per.score) * 0.01 +
            (+rollData.actor.system.initiative.mod) * 0.01 +
            (+rollData.actor.system.attributes.agi.score) * 0.01).toPrecision(2);
        rollString = rollString + "+" + (+fraction);

        // Apply costs
        if ((rollData.characterpoints > 0) && (rollData.actor.system.characterpoints.value > 0)) {
            const update: any = {};
            update.system = {};
            update.system.characterpoints = {};
            update.id = rollData.actor.id;
            update.system.characterpoints.value = rollData.actor.system.characterpoints.value -= rollData.characterpoints;
            await rollData.actor.update(update, {diff: true});
        }

        const messageOptions: any = {
            'flags.nonex-ist-od6s.canUseCp': true
        };
        const initOptions: {formula: string; messageOptions: any; messageMode?: string} = {
            formula: rollString,
            messageOptions,
        };
        if (game.user.isGM && game.settings.get('nonex-ist-od6s', 'hide-gm-rolls')) initOptions.messageMode = MESSAGE_MODES.GM;
        await game.combats.active.rollInitiative(rollData.combatantId, initOptions);
    }
}
