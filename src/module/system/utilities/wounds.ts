import OD6S from "../../config/config-od6s";
import {isCharacterActor} from "../type-guards";

// ---- Pure functions (testable without Foundry globals) ----

/**
 * Look up wound penalty from a deadliness table.
 * @param deadlinessTable - e.g. OD6S.deadliness[3]
 * @param woundValue - the actor's current wound level index
 */
export function lookupWoundPenalty(
    deadlinessTable: Record<number, { penalty: number }>,
    woundValue: number
): number {
    return deadlinessTable[woundValue]?.penalty ?? 0;
}

/**
 * Look up wound level description from a deadliness table.
 */
export function lookupWoundLevel(
    deadlinessTable: Record<number, { core: string }>,
    woundValue: number
): string {
    return deadlinessTable[woundValue]?.core ?? '';
}

/**
 * Determine injury description from damage value and damage table.
 * @param damage - numeric damage value
 * @param damageTable - ordered map of { threshold: number } or { damage: number }
 * @param isVehicle - whether to use vehicle damage format
 */
export function lookupInjury(
    damage: number,
    damageTable: Record<string, number | { damage: number }>,
    isVehicle: boolean
): string {
    let resultMessage = '';
    for (const result in damageTable) {
        const threshold = isVehicle
            ? (damageTable[result] as { damage: number }).damage
            : damageTable[result] as number;
        if (damage >= threshold) {
            resultMessage = result;
        } else {
            break;
        }
    }
    return resultMessage;
}

// ---- Foundry-dependent wrappers ----

/**
 * Resolve the deadliness-table index for an actor, honoring the `woundConfig`
 * override. NOTE: `OD6S.deadlinessLevel[type]` is the cached raw setting and
 * does NOT apply the `woundConfig === 1` override — prefer this helper.
 */
function getDeadlinessLevel(actorType: string): number {
    if (OD6S.woundConfig === 1) return 3;
    const settingKey = actorType === 'npc' ? 'npc-deadliness'
        : actorType === 'creature' ? 'creature-deadliness'
        : 'deadliness';
    return game.settings.get('nonex-ist-od6s', settingKey) as number;
}

/**
 * Get the action penalty from the actor's wound level vs. the system wound levels
 */
export function getWoundPenalty(actor: Actor): number {
    if (!isCharacterActor(actor)) return 0;
    return lookupWoundPenalty(OD6S.deadliness[getDeadlinessLevel(actor.type)], actor.system.wounds.value);
}

export function getWoundLevel(value: number, actor: Actor): string {
    return lookupWoundLevel(OD6S.deadliness[getDeadlinessLevel(actor.type)], value);
}

export function getInjury(damage: number, actorType: OD6SActorType | "system"): string {
    if (actorType === "vehicle" || actorType === "starship") {
        return lookupInjury(damage, OD6S.vehicle_damage, true);
    } else {
        return lookupInjury(damage, OD6S.damage, false);
    }
}
