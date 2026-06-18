import {od6sroll} from "../../apps/roll";
import OD6S from "../../config/config-od6s";
import {
    findWoundLevelByCore,
    computeNewDamageLevel,
    computeNewWoundLevel,
} from "./wounds-math";
import {isArmorItem, isCharacterActor, isVehicleActor} from "../../system/type-guards";
import {debug} from "../../system/logger";

export {findWoundLevelByCore, computeNewDamageLevel, computeNewWoundLevel};

type ActorUpdate = Record<string, unknown> & {id?: string; _id?: string};

export async function applyDamage(actor: Actor, damage: string): Promise<void> {
    if (!isVehicleActor(actor)) return;
    const update: ActorUpdate = {
        id: actor.id,
        _id: actor.id,
        system: {damage: {value: calculateNewDamageLevel(actor, damage)}},
    };
    await actor.update(update);
}

export function calculateNewDamageLevel(actor: Actor, damage: string): string | undefined {
    if (!isVehicleActor(actor)) return undefined;
    const current = actor.system.damage.value;
    const next = computeNewDamageLevel(current, damage);
    debug('wounds', 'damage transition', {actor: actor.name, current, incoming: damage, next});
    return next;
}

export async function applyWounds(actor: Actor, wound: string): Promise<void> {
    if (!isCharacterActor(actor)) return;
    const newValue = calculateNewWoundLevel(actor, wound);
    const update: ActorUpdate = {
        id: actor.id,
        _id: actor.id,
    };
    const armorUpdates: Array<Record<string, unknown> & {_id: string}> = [];
    if (wound === 'NONEX_IST_OD6S.WOUNDS_STUNNED') {
        update[`system.stuns.current`] = 1;
        update[`system.stuns.rounds`] = 1;
        update[`system.stuns.value`] = actor.system.stuns.value + 1;
    }

    if (game.settings.get('nonex-ist-od6s', 'weapon_armor_damage') && game.settings.get('nonex-ist-od6s', 'auto_armor_damage')) {
        for (const value of actor.itemTypes.armor) {
            if (!isArmorItem(value)) continue;
            const damaged = value.system.damaged ?? 0;
            if (!value.system.equipped.value) continue;

            let armorDamage = 0;
            switch (wound) {
                case 'NONEX_IST_OD6S.WOUNDS_WOUNDED':
                    if (damaged <= 1) armorDamage = 1;
                    break;
                case 'NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED':
                    if (damaged <= 1) armorDamage = 1;
                    break;
                case 'NONEX_IST_OD6S.WOUNDS_INCAPACITATED':
                    if (damaged <= 2) armorDamage = 2;
                    break;
                case 'NONEX_IST_OD6S.WOUNDS_MORTALLY_WOUNDED':
                    if (damaged <= 3) armorDamage = 3;
                    break;
                case 'NONEX_IST_OD6S.WOUNDS_DEAD':
                    if (damaged <= 4) armorDamage = 4;
                    break;
                default:
                    break;
            }
            if (armorDamage > 0 && value._id) {
                armorUpdates.push({
                    _id: value._id,
                    system: {damaged: armorDamage},
                });
            }
        }
    }
    if (armorUpdates.length > 0) {
        await actor.updateEmbeddedDocuments('Item', armorUpdates);
    }

    update[`system.wounds.value`] = newValue;
    await actor.update(update);
}

export function calculateNewWoundLevel(actor: Actor, wound: string): string | number | undefined {
    if (!isCharacterActor(actor)) return undefined;
    const deadlinessTable = OD6S.deadliness[OD6S.deadlinessLevel[actor.type]];
    const current = actor.system.wounds.value;
    const next = computeNewWoundLevel(current, wound, deadlinessTable, OD6S.stunDamageIncrement);
    debug('wounds', 'wound transition', {
        actor: actor.name,
        current,
        currentCore: deadlinessTable[current]?.core,
        incoming: wound,
        next,
        nextCore: next !== undefined ? deadlinessTable[String(next)]?.core : undefined,
        stunDamageIncrement: OD6S.stunDamageIncrement,
    });
    return next;
}

export async function triggerMortallyWoundedCheck(actor: Actor): Promise<void> {
    if (!isCharacterActor(actor)) return;
    const flag = actor.getFlag('nonex-ist-od6s', 'mortally_wounded');
    if (flag === undefined) return;
    const rollData = {
        name: game.i18n.localize('NONEX_IST_OD6S.RESIST_MORTALLY_WOUNDED'),
        actor: actor,
        score: actor.system.attributes.str.score,
        type: 'mortally_wounded',
        difficulty: flag,
        difficultyLevel: 'NONEX_IST_OD6S.DIFFICULTY_CUSTOM'
    };
    await od6sroll._onRollDialog(rollData);
}

export async function applyMortallyWoundedFailure(actor: Actor): Promise<void> {
    if (!isCharacterActor(actor)) return;
    if (game.settings.get('nonex-ist-od6s', 'auto_status')) {
        await actor.toggleStatusEffect('dead', {overlay: false, active: true});
    }

    const table = OD6S.deadliness[OD6S.deadlinessLevel[actor.type]];
    const dead = Object.keys(table).find((key) => table[key].core === 'NONEX_IST_OD6S.WOUNDS_DEAD');
    const update = {
        system: {
            wounds: {
                value: dead
            }
        }
    };

    await actor.update(update);
    await actor.unsetFlag('nonex-ist-od6s', 'mortally_wounded');
}

export async function applyIncapacitatedFailure(actor: Actor): Promise<void> {
    const roll = await new Roll("10d6").evaluate();
    const flavor = actor.name + game.i18n.localize('NONEX_IST_OD6S.CHAT_UNCONSCIOUS_01') +
        roll.total + game.i18n.localize('NONEX_IST_OD6S.CHAT_UNCONSCIOUS_02');
    if (game.modules.get("dice-so-nice")?.active) game.dice3d.messageHookDisabled = true;
    await roll.toMessage({flavor: flavor});
    if (game.modules.get("dice-so-nice")?.active) game.dice3d.messageHookDisabled = false;

    await actor.toggleStatusEffect('unconscious', {overlay: false, active: true});
}

export function getWoundLevelFromBodyPoints(actor: Actor, bp?: number): string | undefined {
    if (!isCharacterActor(actor)) return;
    const sys = actor.system;
    const bodyPointsCurrent = typeof bp !== 'undefined' ? bp : sys.wounds.body_points.current;

    if (bodyPointsCurrent < 1) return 'NONEX_IST_OD6S.WOUNDS_DEAD';
    const ratio = Math.ceil(bodyPointsCurrent / sys.wounds.body_points.max * 100);
    let level: string | undefined;
    for (const key in OD6S.bodyPointLevels) {
        if (ratio < OD6S.bodyPointLevels[key]) {
            level = key;
        } else {
            break;
        }
    }
    if (typeof level === 'undefined') level = 'NONEX_IST_OD6S.WOUNDS_HEALTHY';
    return level;
}

export async function setWoundLevelFromBodyPoints(actor: Actor, bp: number): Promise<void> {
    const update: ActorUpdate = {
        id: actor.id,
        _id: actor.id,
    };
    update[`system.wounds.body_points.current`] = bp;
    await actor.update(update);
    update[`system.wounds.value`] = Object.entries(OD6S.deadliness[3]).find(
        ([_k, v]) => v.description === actor.getWoundLevelFromBodyPoints(),
    )?.[0];
    await actor.update(update);
}
