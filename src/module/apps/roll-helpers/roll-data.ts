/**
 * RollData type definitions and small pure helpers shared by roll-setup,
 * roll-execute, roll-difficulty, and the roll dialog. No Foundry globals.
 *
 * Note: this is the structural type — many fields are still loosely typed
 * because the legacy code stores tokens, actors, and items as `any`. As the
 * roll flow migrates to ApplicationV2, fields here can tighten.
 */

import type {Modifier} from "./difficulty-math";

export interface RollModifiers {
    range: string;
    attackoption: string;
    calledshot: string;
    cover: string;
    coverlight: string;
    coversmoke: string;
    miscmod: number;
    scalemod: number;
}

export interface DiceValue {
    dice: number;
    pips: number;
}

/**
 * One row in `RollData.skills` (metaphysics rolls). Drives the per-skill
 * dice/pips/difficulty UI in `templates/metaphysicsRoll.html`.
 */
export interface MetaphysicsSkillRollEntry {
    skill: { name: string };
    system: { total: number };
    difficulty: string;
}

export interface RollData {
    label: string;
    title: string;
    dice: number;
    pips: number;
    specSkill: string;
    originaldice: number;
    originalpips: number;
    score: number;
    wilddie: boolean;
    showWildDie: boolean;
    canusefp: boolean;
    fatepoint: boolean;
    fatepointeffect: boolean;
    characterpoints: number;
    canusecp: boolean;
    contact: boolean;
    cpcost: number;
    cpcostcolor: string;
    bonusdice: number;
    bonuspips: number;
    isvisible: boolean;
    isknown: boolean;
    isExplosive: boolean;
    type: string;
    subtype: string;
    attribute: string | null;
    actor: Actor;
    token: Token | undefined;
    actionpenalty: number;
    woundpenalty: number;
    stunnedpenalty: number;
    otherpenalty: number;
    multishot: boolean;
    shots: number;
    fulldefense: boolean;
    itemid: string;
    targets: Token[];
    target?: Token;
    timer: number;
    damagetype: string;
    damagescore: number;
    stundamagetype: string;
    stundamagescore: number;
    damagemodifiers: Modifier[];
    difficultylevel: string;
    isoppasable: boolean;
    difficulty: number;
    scaledice: number;
    seller: string;
    vehicle: string;
    vehiclespeed: string;
    vehiclecollisiontype: string;
    vehicleterraindifficulty: string;
    source: string;
    range: string;
    template: string;
    /**
     * Per-skill entries used by metaphysics rolls. Keyed by skill id; populated
     * by metaphysics roll setup and mutated by the dialog's `.difficultylevel
     * select` change handler. Absent for non-metaphysics rolls. Shape matches
     * `templates/metaphysicsRoll.html`'s reads of `.skill.name`,
     * `.system.total`, and `.difficulty`.
     */
    skills?: Record<string, MetaphysicsSkillRollEntry>;
    only_stun: boolean;
    can_stun: boolean;
    stun: boolean;
    attackerScale: number;
    modifiers: RollModifiers;
    /** messageMode chosen in the roll dialog (`public`/`gm`/`blind`/`self`). */
    rollmode?: string;
    /**
     * Region id of the explosive blast template tied to this roll. Set by
     * `OD6SItem.roll(parry, regionId)` for explosive throws routed through
     * the auto-explosive flow. All later read sites (range/origin lookup,
     * cleanup, scatter) address the per-throw `flags.nonex-ist-od6s.explosivePending`
     * map by this id, so multiple in-flight throws of the same item can't
     * clobber each other.
     */
    regionId?: string;
}

/**
 * Raw event/dataset payload passed into setupRollData and _onRollDialog.
 * Many fields are mutated during assembly in roll-setup.ts.
 */
export interface IncomingRollData {
    actor: Actor;
    name: string;
    score: number;
    type: string;
    subtype?: string;
    token?: string;
    itemId?: string;
    difficulty?: number;
    difficultyLevel?: string;
    flatpips?: number;
    attribute?: string;
    seller?: string;
    scale?: number | null;
    damage?: number;
    damage_type?: string;
    range?: { short: number; medium: number; long: number } | false;
    /** See {@link RollData.regionId}. */
    regionId?: string;
}

/** Flags written into ChatMessage.flags["nonex-ist-od6s"] by executeRollAction. */
export interface RollMessageFlags {
    actorId: string | null;
    targetName: string | undefined;
    targetId: string | undefined;
    targetType: string | undefined;
    baseDifficulty: number;
    difficulty: number;
    difficultyLevel: string;
    baseDamage: number;
    damageScore: number;
    damageDice: DiceValue;
    strModDice: DiceValue | undefined;
    damageScaleBonus: number;
    damageScaleDice: number;
    damageModifiers: Modifier[];
    damageType: string;
    damageTypeName: string;
    stun: boolean;
    fatepointineffect: boolean;
    isExplosive: boolean;
    range: string;
    type: string;
    subtype: string;
    multiShot: boolean;
    modifiers: Modifier[];
    isEditable: boolean;
    editing: boolean;
    isVisible: boolean;
    isKnown: boolean;
    isOpposable: boolean;
    wild: boolean;
    wildHandled: boolean;
    wildResult: string;
    canUseCp: boolean;
    specSkill: string;
    vehicle: string;
    vehiclespeed: string;
    vehicleterraindifficulty: string;
    source: string;
    location: string;
    seller: string;
    purchasedItem: string;
    itemId: string;
    attackerScale: number;
    success?: boolean;
    total?: number;
    showButton?: boolean;
    triggered?: boolean;
    targets?: unknown;
    originalroll?: unknown;
    /**
     * Persisted message-visibility mode chosen at message creation — a
     * `messageMode` key (`public`/`gm`/`blind`/`self`). Read by chat-mode.ts so
     * the renderer can distinguish self vs gm in single-GM worlds, where
     * `whisper === [author.id]` is ambiguous. (Historical messages may still
     * carry the legacy `publicroll`/… values; chat-mode.ts maps both.)
     */
    rollMode?: string;
    /**
     * Region id of the blast template for explosive attack messages. Lets
     * cleanup paths (chat preDelete, detonation, manual remove) recover the
     * per-throw entry in `item.flags.nonex-ist-od6s.explosivePending` without falling
     * back to the latest scalar item flag (which is racy across multiple
     * in-flight throws of the same item).
     */
    template?: string;
}

// ---- Pure helpers ----

/**
 * Compute the scale modifier (attacker scale minus defender scale).
 * Returns 0 when scales match. Mirrors lines 305-313 of roll-setup.ts.
 */
export function computeScaleMod(attackerScale: number, defenderScale: number): number {
    if (attackerScale === defenderScale) return 0;
    return attackerScale - defenderScale;
}

/**
 * Coerce a scale value: undefined/null becomes 0; everything else passes through.
 * Mirrors the `typeof === 'undefined' ? 0 : score` pattern used repeatedly.
 */
export function coerceScale(value: number | undefined | null): number {
    return typeof value === 'number' && !isNaN(value) ? value : 0;
}

/**
 * Whether a roll's score is below the minimum required for at least 1 die.
 * Mirrors the SCORE_TOO_LOW check in roll-setup.ts:410-413.
 *
 * `flatSkillsBypass` represents the OD6S.flatSkills && (type==='skill' || type==='specialization') exemption.
 */
export function isScoreTooLow(
    score: number,
    pipsPerDice: number,
    flatSkillsBypass: boolean,
): boolean {
    if (flatSkillsBypass) return false;
    return score < pipsPerDice;
}

// ---- Roll-type classification (#98 prep) ----

import { weaponTypes } from "../../config/weapons";

/**
 * Stable handler-dispatch keys for every (type, subtype) path setupRollData
 * accepts. Drives the per-handler decomposition planned in #98 — a future
 * `switch (key)` over this union gets TypeScript exhaustiveness for free.
 */
export type RollTypeKey =
    | 'weapon'
    | 'starship-weapon'
    | 'vehicle-weapon'
    | 'action-meleeattack'
    | 'action-brawlattack'
    | 'action-rangedattack'
    | 'action-vehiclerangedattack'
    | 'action-vehiclerangedweaponattack'
    | 'action-vehicleramattack'
    | 'action-attribute'
    | 'action-other'
    | 'skill'
    | 'skill-dodge'
    | 'specialization'
    | 'damage'
    | 'resistance'
    | 'resistance-vehicletoughness'
    | 'mortally_wounded'
    | 'incapacitated'
    | 'funds'
    | 'purchase'
    | 'attribute';

/** Canonical post-normalization roll types. Output of classifyRoll. */
export type CanonicalRollType =
    | 'weapon' | 'starship-weapon' | 'vehicle-weapon'
    | 'action' | 'skill' | 'specialization'
    | 'damage' | 'resistance'
    | 'mortally_wounded' | 'incapacitated'
    | 'funds' | 'attribute';

export interface ClassifiedRoll {
    type: CanonicalRollType;
    /**
     * Canonical subtype after normalization. Empty string when none.
     * Load-bearing for `action-other`: that key collapses every unrecognized
     * action subtype into one bucket while preserving the original string here,
     * so callers handling action-other can still inspect the input subtype.
     */
    subtype: string;
    key: RollTypeKey;
}

export type Localize = (key: string) => string;

const MELEE_WEAPON_TYPE_KEY = 'NONEX_IST_OD6S.MELEE';

const RESISTANCE_NAME_ALIASES = [
    'NONEX_IST_OD6S.ENERGY_RESISTANCE',
    'NONEX_IST_OD6S.PHYSICAL_RESISTANCE',
    'NONEX_IST_OD6S.RESISTANCE_NO_ARMOR',
] as const;

/**
 * Pure classifier: maps an incoming roll request to its canonical (type, subtype)
 * and a stable handler key. Mirrors the normalization scattered through
 * roll-setup.ts: localized subtype aliases (RANGED/MELEE/…) → canonical attack
 * subtypes; top-level vehicletoughness → resistance; top-level purchase → funds;
 * skill+Dodge → skill+dodge; action+vehicletoughness → resistance;
 * action+'' with a resistance i18n name → resistance.
 *
 * Pass `localize` (e.g. `game.i18n.localize.bind(game.i18n)`) so the helper
 * stays Foundry-free and unit-testable.
 */
export function classifyRoll(
    input: { type: string; subtype?: string; name?: string },
    localize: Localize,
): ClassifiedRoll {
    let type = input.type;
    let subtype = input.subtype ?? '';
    const name = input.name ?? '';

    // Reuses the canonical weapon-type list from config/weapons so adding a
    // new ranged weapon type there picks up alias normalization automatically.
    for (const k of weaponTypes) {
        if (subtype === localize(k)) {
            subtype = k === MELEE_WEAPON_TYPE_KEY ? 'meleeattack' : 'rangedattack';
            break;
        }
    }

    if (type === 'skill' && name === 'Dodge') {
        subtype = 'dodge';
    }

    if (type === 'vehicletoughness') {
        type = 'resistance';
        subtype = 'vehicletoughness';
    } else if (type === 'purchase') {
        type = 'funds';
        subtype = 'purchase';
    }

    if (type === 'action') {
        if (subtype === 'vehicletoughness') {
            type = 'resistance';
        } else if (subtype === '' &&
                   RESISTANCE_NAME_ALIASES.some(k => name === localize(k))) {
            type = 'resistance';
        }
    }

    if (!isCanonicalType(type)) {
        throw new Error(`classifyRoll: unrecognized roll type "${type}"`);
    }
    return { type, subtype, key: deriveRollTypeKey(type, subtype) };
}

function isCanonicalType(type: string): type is CanonicalRollType {
    switch (type) {
        case 'weapon': case 'starship-weapon': case 'vehicle-weapon':
        case 'action': case 'skill': case 'specialization':
        case 'damage': case 'resistance':
        case 'mortally_wounded': case 'incapacitated':
        case 'funds': case 'attribute':
            return true;
        default:
            return false;
    }
}

function deriveRollTypeKey(type: CanonicalRollType, subtype: string): RollTypeKey {
    switch (type) {
        case 'weapon': return 'weapon';
        case 'starship-weapon': return 'starship-weapon';
        case 'vehicle-weapon': return 'vehicle-weapon';
        case 'skill': return subtype === 'dodge' ? 'skill-dodge' : 'skill';
        case 'specialization': return 'specialization';
        case 'damage': return 'damage';
        case 'resistance':
            return subtype === 'vehicletoughness' ? 'resistance-vehicletoughness' : 'resistance';
        case 'mortally_wounded': return 'mortally_wounded';
        case 'incapacitated': return 'incapacitated';
        case 'funds': return subtype === 'purchase' ? 'purchase' : 'funds';
        case 'attribute': return 'attribute';
        case 'action':
            switch (subtype) {
                case 'meleeattack': return 'action-meleeattack';
                case 'brawlattack': return 'action-brawlattack';
                case 'rangedattack': return 'action-rangedattack';
                case 'vehiclerangedattack': return 'action-vehiclerangedattack';
                case 'vehiclerangedweaponattack': return 'action-vehiclerangedweaponattack';
                case 'vehicleramattack': return 'action-vehicleramattack';
                case 'attribute': return 'action-attribute';
                default: return 'action-other';
            }
    }
}
