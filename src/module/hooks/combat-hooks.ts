import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import {OD6SInitiative} from "../system/initative";
import {error as logError} from "../system/logger";

/**
 * Clear an actor's action list
 * @param actor
 * @returns {Promise<void>}
 */
async function clearActionList(actor: any) {
    if (actor !== null) {
        const actions = actor.itemTypes.action;
        for (let i = 0; i < actions.length; i++) {
            await actor.deleteEmbeddedDocuments('Item', [actions[i].id]);
        }
    }
}

export function registerCombatHooks() {
    Hooks.on("preCreateCombatant", (combatant) => {
        if (combatant.actor.type === "container") return false;
        if ((combatant.actor.type === "vehicle" || combatant.actor.type === "starship") &&
            !combatant.actor.system?.embedded_pilot.value) {
            return false;
        }
        return undefined;
    })

    Hooks.on("updateCombat", async (Combat, _data, _options, _userId) => {
        if (game.user.isGM && Combat.round === 1 && Combat.turn === 0 && Combat.active && OD6S.startCombat) {
            // At the start of a new combat, make sure all actor's action lists are cleared
            OD6S.startCombat = false;
            for (let i = 0; i < Combat.combatants.length; i++) {
                await clearActionList(Combat.combatants[i].actor);
            }
        }

        if (game.user.isGM && Combat.round !== 0 && Combat.turn === 0 && Combat.active && !OD6S.startCombat) {
            // New round
        }

        // Actor has started their turn, clear their action list and defensive bonuses/penalties

        if (Combat.combatant?.actor) {
            if (game.user.isGM) {

                if (!game.settings.get('nonex-ist-od6s', 'reaction_skills')) {
                    const update: any = {};
                    update.id = Combat.combatant.actor.id;
                    update.system = {};
                    update.system.parry = {};
                    update.system.parry.score = 0;
                    update.system.dodge = {};
                    update.system.dodge.score = 0;
                    update.system.block = {};
                    update.system.block.score = 0;
                    await Combat.combatant.actor.update(update, {'diff': true});

                    if (Combat.combatant.actor.isCrewMember()) {
                        if (Combat.combatant.actor.system.vehicle.dodge.score > 0) {
                            const vehicleId = Combat.combatant.actor.getFlag('nonex-ist-od6s', 'crew');
                            const dodgeActor = await OD6S.socket.executeAsGM('getVehicleFlag', vehicleId, 'dodge_actor');
                            if (dodgeActor === Combat.combatant.actor.uuid) {
                                const vUpdate: any = {};
                                vUpdate.flags = {};
                                vUpdate.flags["nonex-ist-od6s"] = {};
                                vUpdate.system = {};
                                vUpdate.system.dodge = {};
                                vUpdate.system.dodge.score = 0;
                                await OD6S.socket.executeAsGM('updateVehicle', game.user.id, vehicleId, vUpdate);
                                await OD6S.socket.executeAsGM('unsetVehicleFlag', game.user.id, vehicleId, 'dodge_actor');
                            }
                        }
                    }
                }
                if (!OD6S.fatePointRound) {
                    await Combat.combatant.actor.setFlag('nonex-ist-od6s', 'fatepointeffect', false);
                }
            }
        }
    })

    // preUpdateCombat is a synchronous hook: the bookkeeping below runs
    // fire-and-forget and the handler itself never returns a value, so it can
    // neither cancel the update nor leak an unhandled rejection.
    Hooks.on("preUpdateCombat", (Combat, data, options, userId) => {
        void endOfRoundBookkeeping(Combat, data, options, userId).catch((err: unknown) => {
            logError('combat-hooks', 'end-of-round bookkeeping failed', err);
        });
    })

    async function endOfRoundBookkeeping(Combat: any, data: any, options: any, userId: string) {
        // End-of-round stuff here
        if (data.turn === 0) {
            // Initiative
            if (game.user.isGM && game.settings.get('nonex-ist-od6s', 'reroll_initiative')) {
                await OD6SInitiative._onPreUpdateCombat(Combat, data, options, userId);
            }
            if (game.user.isGM) {
                for (let i = 0; i < Combat.combatants.size; i++) {
                    const combatant = Combat.combatants.contents[i].token;

                    if (typeof (combatant) !== 'undefined') {
                        await clearActionList(combatant.actor);

                        const rounds = combatant.actor.system?.stuns?.rounds;
                        const update: any = {};
                        update.id = combatant.id;
                        update.system = {};

                        // Check if stun needs to be removed
                        if (rounds < 1) {
                            // Remove any stun status effects
                            const effect = combatant.actor.effects.contents.find(
                                (i: any) => i.statuses?.has('stunned'));

                            if (typeof (effect) !== 'undefined') {
                                await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
                            }
                            update.system.stuns = {};
                            update.system.stuns.rounds = 0;
                            update.system.stuns.current = 0;
                            update.system.stuns.value = combatant.actor.system.stuns.value;
                        } else if (rounds > 0) {
                            update.system.stuns = {};
                            update.system.stuns.rounds = rounds - 1;
                        }

                        if (game.settings.get('nonex-ist-od6s', 'reaction_skills')) {
                            update.system.parry = {};
                            update.system.parry.score = 0;
                            update.system.dodge = {};
                            update.system.dodge.score = 0;
                            update.system.block = {};
                            update.system.block.score = 0;

                            if (combatant.actor.isCrewMember()) {
                                const vUpdate: any = {};
                                vUpdate.system = {};
                                vUpdate.system.dodge = {};
                                vUpdate.system.dodge.score = 0;
                                const vehicleId = combatant.actor.getFlag('nonex-ist-od6s', 'crew');
                                const vehicle = await od6sutilities.getActorFromUuid(vehicleId);
                                if (typeof vehicle !== 'undefined') {
                                    await vehicle.update(vUpdate);
                                }
                            }
                        }
                        await combatant.actor.update(update, {'diff': true});
                        if (OD6S.fatePointRound) {
                            await combatant.actor.setFlag('nonex-ist-od6s', 'fatepointeffect', false);
                        }

                        if (game.settings.get('nonex-ist-od6s', 'auto_mortally_wounded')) {
                            if (combatant.actor.getFlag('nonex-ist-od6s', 'mortally_wounded') !== undefined) {
                                await combatant.actor.setFlag('nonex-ist-od6s', 'mortally_wounded',
                                    combatant.actor.getFlag('nonex-ist-od6s', 'mortally_wounded') + 1);
                                if(combatant.hasPlayerOwner) {
                                    OD6S.socket.executeForOthers("triggerRoll", 'mortally_wounded', combatant.uuid);
                                } else {
                                    combatant.actor.triggerMortallyWoundedCheck();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Hooks.on("deleteCombat", async function (Combat) {
        // Combat is over, clear all combatant action lists
        for (let i = 0; i < Combat.combatants.size; i++) {
            const combatant = Combat.combatants.contents[i].actor;
            if (typeof (combatant) !== 'undefined') {
                await clearActionList(combatant)
                const update: any = {};
                update.id = combatant.id;
                update.system = {};
                update.system.parry = {};
                update.system.parry.score = 0;
                update.system.dodge = {};
                update.system.dodge.score = 0;
                update.system.block = {};
                update.system.block.score = 0;
                await combatant.update(update, {'diff': true});
                await combatant.setFlag('nonex-ist-od6s', 'fatepointeffect', false);
            }
        }
    })
}
