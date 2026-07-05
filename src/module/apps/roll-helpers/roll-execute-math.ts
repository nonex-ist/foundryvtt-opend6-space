/**
 * Pure math helpers extracted from roll-execute.ts. No Foundry globals.
 * Lets tests import without dragging in Roll/Dialog/etc.
 */
import { getDiceFromScore } from "../../system/utilities/dice";
import type { Modifier } from "./difficulty-math";
import type { DiceValue } from "./roll-data";

export interface HighHitDamageInput {
    /** Final roll total. */
    rollTotal: number;
    /** Difficulty the roll was measured against. */
    difficulty: number;
    /** Setting: how much excess success per damage step (OD6S.highHitDamageMultiplier). */
    multiplier: number;
    /** Setting: round-down (true) vs round-up (false). */
    roundDown: boolean;
    /** Setting: emit as pips (true) vs whole damage dice (false). */
    asPips: boolean;
}

export interface HighHitDamageResult {
    /** Extra damage value to push as a damage modifier. */
    extra: number;
    /** Whether the result should be applied as pips (true) or dice (false). */
    asPips: boolean;
}

/**
 * Compute the high-hit damage bonus when a roll exceeds its difficulty.
 * Returns { extra: 0 } when the roll fails — caller should still skip applying.
 */
export function computeHighHitDamage(input: HighHitDamageInput): HighHitDamageResult {
    const { rollTotal, difficulty, multiplier, roundDown, asPips } = input;
    const difference = rollTotal - difficulty;
    if (difference <= 0 || multiplier <= 0) return { extra: 0, asPips };
    const extra = roundDown
        ? Math.floor(difference / multiplier)
        : Math.ceil(difference / multiplier);
    return { extra, asPips };
}

export interface DieResult {
    result: number;
    active: boolean;
    discarded?: boolean;
}

export interface WildDieReductionResult {
    /** Index of the die to discard (the highest-rolling base die). */
    discardedIndex: number;
    /** New roll total after discarding the highest base die and subtracting 1 (the wild die's natural 1). */
    newTotal: number;
}

/**
 * When the wild die rolls a 1 and the configured outcome is "discard highest base die",
 * find which base die to drop and compute the adjusted total.
 *
 * The original total is reduced by the discarded die's value plus 1 (representing the
 * wild die's own 1 that triggered this path).
 */
export function computeWildDieReduction(
    baseDieResults: DieResult[],
    originalTotal: number,
): WildDieReductionResult {
    let highest = 0;
    for (let i = 0; i < baseDieResults.length; i++) {
        if (baseDieResults[i].result > baseDieResults[highest].result) {
            highest = i;
        }
    }
    const newTotal = originalTotal - baseDieResults[highest].result - 1;
    return { discardedIndex: highest, newTotal };
}

export interface ResolveMessageModeInput {
    /** Per-roll mode chosen in the dialog, if any. Wins over hide-gm-rolls. */
    explicit?: string | null;
    isGM: boolean;
    hideGmRolls: boolean;
}

/**
 * Resolve the `messageMode` passed to ChatMessage (a key of
 * `CONFIG.ChatMessage.modes`). An explicit dialog choice always wins; otherwise
 * GMs with `hide-gm-rolls` get `gm`, everyone else `public`.
 */
export function resolveMessageMode(input: ResolveMessageModeInput): string {
    if (typeof input.explicit === "string" && input.explicit.length > 0) return input.explicit;
    if (input.isGM && input.hideGmRolls) return "gm";
    return "public";
}

export interface DicePenalties {
    action: number;
    wound: number;
    stunned: number;
    other: number;
}

/**
 * Subtract action/wound/stun/misc penalties from a dice pool.
 * Result may go negative — callers decide what to do (typically "no roll").
 */
export function applyDicePenalties(dice: number, penalties: DicePenalties): number {
    return dice - penalties.action - penalties.wound - penalties.stunned - penalties.other;
}

export interface RollStringFlavorLabels {
    base: string;
    wild: string;
    cp: string;
    bonus: string;
}

export interface RollStringInput {
    /**
     * Total dice in the pool. When `wilddie` is true, this is the pool *including*
     * the wild die — the helper subtracts 1 internally to leave room for it.
     */
    dice: number;
    pips: number;
    characterpoints: number;
    bonusdice: number;
    bonuspips: number;
    wilddie: boolean;
    /** When > 0, the formula is wrapped in `max(formula, rollMin)` to enforce a skill floor. */
    rollMin?: number;
    labels: RollStringFlavorLabels;
}

/**
 * Build the dice formula string Foundry's `Roll` will parse. Returns '' when the
 * pool is empty so the caller can short-circuit with a "zero dice" notification.
 */
export function buildRollString(input: RollStringInput): string {
    const { pips, characterpoints, bonusdice, bonuspips, wilddie, rollMin, labels } = input;
    let s: string;
    if (wilddie) {
        const baseDice = input.dice - 1;
        if (baseDice === 0) {
            s = "1dw" + labels.wild;
        } else if (baseDice < 0) {
            s = "";
        } else {
            s = baseDice + "d6" + labels.base + "+1dw" + labels.wild;
        }
    } else {
        s = input.dice <= 0 ? "" : input.dice + "d6" + labels.base;
    }
    if (pips > 0) s += "+" + pips;
    if (characterpoints > 0) s += "+" + characterpoints + "db" + labels.cp;
    if (bonusdice > 0) s += "+" + bonusdice + "d6" + labels.bonus;
    if (bonuspips > 0) s += "+" + bonuspips;
    // Skip the wrap on an empty formula — `max(,5)` is not parseable, and the
    // empty return tells the caller to short-circuit with a "zero dice" warning.
    if (s !== "" && rollMin !== undefined && rollMin > 0) {
        s = "max(" + s + "," + rollMin + ")";
    }
    return s;
}

export interface WildDieDetectionInput {
    /** Roll terms — only `flavor` and `total` are read. */
    terms: Array<{ flavor?: string; total?: number }>;
    /** Localized wild-die flavor with `[]` already stripped to match `term.flavor`. */
    wildFlavor: string;
    /** OD6S.wildDieOneDefault — when > 0, a default wild-1 outcome is configured. */
    wildDieOneDefault: number;
    /** OD6S.wildDieOneAuto — when 0 (combined with default > 0), the configured outcome is auto-applied (`wildHandled=true`); otherwise the player picks. */
    wildDieOneAuto: number;
}

export interface WildDieDetectionResult {
    wild: boolean;
    wildHandled: boolean;
}

/**
 * Decide whether the wild die rolled a 1 and whether the resulting effect is
 * already considered "handled" (auto-applied) vs. awaiting a player choice.
 */
export function detectWildDieResult(input: WildDieDetectionInput): WildDieDetectionResult {
    const wildTerm = input.terms.find(d => d.flavor === input.wildFlavor);
    if (wildTerm?.total === 1) {
        return {
            wild: true,
            wildHandled: input.wildDieOneDefault > 0 && input.wildDieOneAuto === 0,
        };
    }
    return { wild: false, wildHandled: false };
}

export interface DamageAssemblyInput {
    /** Starting damage score (weapon damage, brawl strength, etc.). */
    damageScore: number;
    /** All damage modifiers — read-only; the helper iterates but does not mutate this array. */
    damageModifiers: Modifier[];
    /** Pre-fatepoint strength damage dice. When fatepoint + STR-bonus modifier are present, a doubled copy is returned via `result.strModDice`; the input is not mutated. */
    strModDice?: DiceValue | null;
    /** Roll subtype — only `vehicleramattack` triggers the speed/collision recompute. */
    subtype: string;
    fatepointInEffect: boolean;
    /** Localized OD6S.SCALE label used to identify scale modifiers in the array. */
    scaleLabel: string;
    /** Setting `dice_for_scale`: when true, scale converts to dice; when false, to a flat bonus. */
    diceForScale: boolean;
    /** rollData.modifiers.scalemod — added to damageScore when diceForScale + positive. */
    scaleMod: number;
    /** rollData.scaledice — surfaced as `damageScaleDice` when diceForScale + scalemod <= 0. */
    scaleDice: number;
    /** Vehicle-ram only: OD6S.vehicle_speeds[speed].damage. */
    vehicleRamDamage?: number;
    /** Vehicle-ram only: OD6S.collision_types[type].score. */
    vehicleRamCollisionScore?: number;
    /** OD6S.pipsPerDice — passed through to dice/score conversion. */
    pipsPerDice: number;
}

export interface DamageAssemblyResult {
    baseDamage: number;
    damageScore: number;
    damageDice: DiceValue;
    /** Possibly-doubled strength-mod dice (when fatepoint applied); pass-through otherwise. */
    strModDice: DiceValue | null | undefined;
    scaleBonus: number;
    scaleDice: number;
}

/**
 * Combine damage modifiers, fatepoint doubling, vehicle-ram override, pip bonuses,
 * and scale handling into the final {damageScore, damageDice, scale*} payload that
 * goes onto the chat-card flags. Pure: takes pipsPerDice as a value, no globals.
 */
export function assembleDamageDice(input: DamageAssemblyInput): DamageAssemblyResult {
    const {
        damageModifiers,
        subtype,
        fatepointInEffect,
        scaleLabel,
        diceForScale,
        scaleMod,
        scaleDice,
        vehicleRamDamage = 0,
        vehicleRamCollisionScore = 0,
        pipsPerDice,
    } = input;

    let damageScore = input.damageScore;
    let baseDamage = damageScore;
    let strModDice = input.strModDice;

    for (const d of damageModifiers) {
        if (d.name === scaleLabel) {
            if (diceForScale) damageScore += d.value;
        } else {
            const isStrBonusUnderFatepoint = fatepointInEffect && d.name === "NONEX_IST_OD6S.STRENGTH_DAMAGE_BONUS";
            if (!isStrBonusUnderFatepoint) damageScore += d.value;
        }
    }

    let damageDice = getDiceFromScore(damageScore, pipsPerDice);

    if (fatepointInEffect && strModDice) {
        const strMod = damageModifiers.find(d => d.name === "NONEX_IST_OD6S.STRENGTH_DAMAGE_BONUS");
        if (strMod) {
            damageDice = {
                dice: damageDice.dice + strModDice.dice * 2,
                pips: damageDice.pips + strModDice.pips * 2,
            };
            strModDice = { dice: strModDice.dice * 2, pips: strModDice.pips * 2 };
        }
    }

    if (subtype === "vehicleramattack") {
        damageScore = damageScore + vehicleRamDamage + vehicleRamCollisionScore;
        baseDamage = damageScore;
        damageDice = getDiceFromScore(damageScore, pipsPerDice);
    }

    for (const d of damageModifiers) {
        if (d.pips !== undefined && d.pips > 0) {
            damageDice = { dice: damageDice.dice, pips: damageDice.pips + d.pips };
        }
    }

    let scaleBonus = 0;
    for (const d of damageModifiers) {
        if (d.name === scaleLabel && !diceForScale) {
            scaleBonus = d.value;
        }
    }

    let scaleDiceOut = 0;
    if (diceForScale) {
        if (scaleMod > 0) {
            damageScore += scaleMod;
        } else {
            scaleDiceOut = scaleDice;
        }
    }

    return {
        baseDamage,
        damageScore,
        damageDice,
        strModDice,
        scaleBonus,
        scaleDice: scaleDiceOut,
    };
}
