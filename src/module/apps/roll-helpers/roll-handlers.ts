/**
 * Per-roll-type handler contract for #98.
 *
 * Each {@link RollTypeKey} maps to a pure {@link Handler} that produces only
 * the fields its bucket in {@link ROLL_TYPE_FIELDS} owns. Handlers are
 * Foundry-free: they consume narrowed views ({@link ActorView},
 * {@link ItemView}, {@link TargetView}, {@link RollSettingsView}) and a
 * pre-computed {@link ClassifiedRoll}. The boundary projection from Foundry
 * documents to these views lives in `roll-context-adapter.ts` (Phase 1 step 2).
 *
 * The output type is mechanically derived from `ROLL_TYPE_FIELDS[key]`, so a
 * handler that tries to write outside its bucket fails to compile. Combined
 * with the partition invariants in `roll-type-fields.ts`, this gives
 * compile-time enforcement of the mutation map.
 *
 * The stub registry below throws on every key so unimplemented handlers fail
 * loudly (and so any miswiring during Phase 2 is caught at first call rather
 * than silently producing partial output).
 */

import type { ClassifiedRoll, IncomingRollData, Localize, RollData, RollTypeKey } from './roll-data';
import type { ROLL_TYPE_FIELDS } from './roll-type-fields';
import { getDiceFromScore } from '../../system/utilities/dice';
import type { Modifier } from './difficulty-math';
import {
    applyWeaponMods,
    buildDamagedWeaponModifier,
    buildStrengthDamageModifier,
    computeStunFlags,
    ramAttackContribution,
} from './weapon-context-math';
import type { ActionResolution } from './action-math';

export type HandlerOutput<K extends RollTypeKey> =
    Pick<RollData, (typeof ROLL_TYPE_FIELDS)[K][number]>;

/**
 * Request data the orchestrator hands to a handler. A projection of
 * {@link IncomingRollData} minus the Foundry `actor` (which lives in
 * {@link HandlerContext.actor} as a narrowed view) plus the classifier
 * output. Handlers consume input + ctx; nothing else.
 */
export type HandlerInput = Omit<IncomingRollData, 'actor'> & {
    classified: ClassifiedRoll;
};

/**
 * Read-only narrowed view of an actor for handler consumption. Discriminated
 * by `type` so handlers branching on actor kind get exhaustive narrowing.
 * Fields grow per family as Phase 2 handlers need them — kept tight rather
 * than mirroring the Foundry shape.
 */
export type ActorView =
    | CharacterActorView
    | NpcActorView
    | VehicleActorView
    | StarshipActorView;

export interface CharacterActorView {
    type: 'character';
    uuid: string;
    /** Attribute scores keyed by lower-case attribute name (str, agi, mec, kno, …). */
    attributes?: Record<string, { score: number }>;
    /** Actor scale (used as attackerScale fallback). */
    scale?: { score: number };
    /** Strength damage score (added to melee damage when weapon.damage.str is set). */
    strengthDamage?: number;
    /** Embedded vehicle reference when the character is piloting one. */
    vehicle?: { uuid: string };
}

export interface NpcActorView {
    type: 'npc';
    uuid: string;
    attributes?: Record<string, { score: number }>;
    scale?: { score: number };
    strengthDamage?: number;
    vehicle?: { uuid: string };
}

export interface VehicleActorView {
    type: 'vehicle';
    uuid: string;
    scale?: { score: number };
    /** Vehicle ram bonus (skill bonus on ram attacks). */
    ram?: { score: number };
    /** Vehicle ram damage (additive damage modifier on ram attacks). */
    ram_damage?: { score: number };
}

export interface StarshipActorView {
    type: 'starship';
    uuid: string;
    scale?: { score: number };
    ram?: { score: number };
    ram_damage?: { score: number };
}

export interface ItemView {
    type: string;
    /** Display name of the item. */
    name?: string;
    /** Skill / specialization item: parent attribute key (case-insensitive). */
    attribute?: string;
    /** Specialization item: parent skill name. */
    skill?: string;
    // ---- Weapon item fields ----
    /** Primary damage. `str` = add strength damage in melee; `muscle` = explicit
     *  strength-damage rider on damage modifiers. */
    damage?: { type: string; score: number; str?: boolean; muscle?: boolean };
    /** Stun damage block. `stun_only` forces stun-only mode. */
    stun?: { type?: string; score?: number; stun_only?: boolean };
    /** Per-band range table or `false` when out-of-range was already resolved. */
    range?: { short: number; medium: number; long: number } | false;
    /** Weapon-defined scale (overrides actor scale when set). */
    scale?: { score: number };
    /** Damage state index (0 = pristine, higher = degraded; resolves to a penalty). */
    damaged?: number;
    /**
     * Weapon mod totals matching the actual weapon schema (numbers, not nested
     * objects). Mapped directly into the WeaponMods shape applyWeaponMods expects.
     */
    mods?: { damage?: number; attack?: number; difficulty?: number };
    /**
     * True when the item's subtype is `explosive`. Set by the adapter so the
     * weapon handler can pass the real value into computeStunFlags (which has
     * an explosive-specific blast-zone-1 stun-damage branch).
     */
    isExplosive?: boolean;
    /** Weapon's authored skill/specialization context. */
    stats?: { skill?: string; specialization?: string };
    /** Blast radius for explosives — only zone "1"'s stun damage is read here. */
    blast_radius?: { '1'?: { stun_damage?: number } };
    /** Authored difficulty label override (when meleeDifficulty setting is on). */
    difficulty?: string;
}

export interface TargetView {
    scale: number;
}

export interface RollSettingsView {
    /** When true, "Unknown" is the default difficulty label instead of "Easy". */
    defaultUnknownDifficulty: boolean;
    /** When true, scale modifiers are paid in dice rather than score adjustments. */
    diceForScale: boolean;
    /** When true, fate-point spends apply to funds/purchase rolls. */
    fundsFate: boolean;
    /** When true, hide combat cards from non-GM observers. */
    hideCombatCards: boolean;
    /** When true, hide skill cards from non-GM observers. */
    hideSkillCards: boolean;
    /** When true, the dialog exposes the parent-skill link for specializations. */
    showSkillSpecialization: boolean;
    /** System-constant pips per die (3 in standard OpenD6). */
    pipsPerDice: number;
    /** When true, weapon-authored difficulty overrides the default for melee. */
    meleeDifficulty: boolean;
    /** When true, explosive zones (multi-radius blasts) are active. */
    explosiveZones: boolean;
    /** Damage state → penalty/label table (system constant from OD6S.weaponDamage). */
    weaponDamageTable: Record<number, { penalty: number; label: string }>;
    /** When true, skill-backed actions roll skill score as flat-pips on top of attribute. */
    flatSkills: boolean;
    /** Fallback attribute key for brawl action when no Brawling skill item exists. */
    brawlAttribute: string;
}

export interface HandlerContext {
    actor: ActorView;
    item?: ItemView;
    targets: ReadonlyArray<TargetView>;
    settings: RollSettingsView;
    localize: Localize;
    /**
     * Pre-resolved skill-backed action result for action-meleeattack /
     * action-brawlattack. The orchestrator runs `resolveSkillBackedAction`
     * once at the boundary (Audit E: deduplicates the call so `flatPips` can
     * be reused for the COMMON-side bonusdice computation) and stashes the
     * result here. Handlers read `score` (and optionally `flatPips`) without
     * reaching for skill / attribute fields themselves.
     *
     * Null/undefined when the actor isn't a character or no resolution is
     * applicable; handlers default to score 0 in that case (the action-* keys
     * that need this only fire for character-piloted paths).
     */
    actionSkillResolved?: ActionResolution | null;
    /**
     * Vehicle stats for vehicle-action handlers when the actor is a character
     * piloting a vehicle (the orchestrator dereferences `actor.system.vehicle`
     * once at the boundary). For vehicle/starship actors, handlers should read
     * from the actor view directly.
     */
    vehicleStats?: {
        scale?: { score: number };
        ram?: { score: number };
        ram_damage?: { score: number };
    };
}

export type Handler<K extends RollTypeKey> = (
    input: HandlerInput,
    ctx: HandlerContext,
) => HandlerOutput<K>;

const skillItemAttribute = (item: ItemView | undefined): string | null =>
    item?.attribute ? item.attribute.toLowerCase() : null;

const skillHandler: Handler<'skill'> = (_input, ctx) => ({
    attribute: skillItemAttribute(ctx.item),
});

const skillDodgeHandler: Handler<'skill-dodge'> = (_input, ctx) => ({
    attribute: skillItemAttribute(ctx.item),
});

const specializationHandler: Handler<'specialization'> = (_input, ctx) => ({
    attribute: skillItemAttribute(ctx.item),
    specSkill: ctx.settings.showSkillSpecialization && ctx.item?.skill ? ctx.item.skill : '',
});

const scaleToDice = (input: HandlerInput, ctx: HandlerContext): number =>
    ctx.settings.diceForScale
        ? getDiceFromScore(input.scale ?? 0, ctx.settings.pipsPerDice).dice
        : 0;

const damageHandler: Handler<'damage'> = () => ({});
const mortallyWoundedHandler: Handler<'mortally_wounded'> = () => ({});
const incapacitatedHandler: Handler<'incapacitated'> = () => ({});

const resistanceHandler: Handler<'resistance'> = (input, ctx) => ({
    scaledice: scaleToDice(input, ctx),
});

const fundsHandler: Handler<'funds'> = () => ({});
const attributeHandler: Handler<'attribute'> = () => ({});

const purchaseHandler: Handler<'purchase'> = (input) => ({
    seller: input.seller ?? '',
});

const isVehicleView = (actor: ActorView): actor is VehicleActorView | StarshipActorView =>
    actor.type === 'vehicle' || actor.type === 'starship';

const isCharacterView = (actor: ActorView): actor is CharacterActorView | NpcActorView =>
    actor.type === 'character' || actor.type === 'npc';

const vehicleUuidForActor = (actor: ActorView): string =>
    isVehicleView(actor) ? actor.uuid : actor.vehicle?.uuid ?? '';

const characterStrengthDamage = (actor: ActorView): number =>
    isCharacterView(actor) ? actor.strengthDamage ?? 0 : 0;

type WeaponBucketCommon = Pick<RollData,
    'damagetype' | 'damagescore' | 'stundamagetype' | 'stundamagescore' |
    'damagemodifiers' | 'source' | 'range' | 'difficultylevel' |
    'only_stun' | 'can_stun' | 'stun' | 'attackerScale' | 'specSkill'
>;

function buildWeaponBucket(input: HandlerInput, ctx: HandlerContext): WeaponBucketCommon {
    const item = ctx.item ?? {} as ItemView;
    const weaponDamageScore = item.damage?.score ?? 0;
    const weaponDamageType = item.damage?.type ?? '';
    const isMelee = input.subtype === 'meleeattack';

    let damagescore = weaponDamageScore;
    let stundamagescore = item.stun?.score ?? 0;
    if (isMelee && item.damage?.str) {
        damagescore = weaponDamageScore + characterStrengthDamage(ctx.actor);
        if (stundamagescore > 0) {
            stundamagescore = stundamagescore + characterStrengthDamage(ctx.actor);
        }
    }

    // applyWeaponMods folds weapon mod totals into damagescore. miscMod and
    // bonusmod also flow through it in the original code but those land on
    // COMMON-side accumulators, so they're discarded here — bucket discipline.
    const modded = applyWeaponMods(
        { damageScore: damagescore, miscMod: 0, bonusmod: 0 },
        {
            damage: item.mods?.damage ?? 0,
            attack: item.mods?.attack ?? 0,
            difficulty: item.mods?.difficulty ?? 0,
        },
    );
    damagescore = modded.damageScore;

    const { onlyStun, canStun } = computeStunFlags({
        stunOnly: item.stun?.stun_only,
        weaponStunScore: item.stun?.score ?? 0,
        isExplosive: !!item.isExplosive,
        explosiveZonesEnabled: ctx.settings.explosiveZones,
        blastZone1StunDamage: item.blast_radius?.['1']?.stun_damage ?? 0,
    });

    const damagemodifiers: Modifier[] = [];
    const damagedMod = buildDamagedWeaponModifier(item.damaged ?? 0, ctx.settings.weaponDamageTable);
    if (damagedMod) damagemodifiers.push(damagedMod);
    if (item.damage?.muscle) {
        damagemodifiers.push(buildStrengthDamageModifier(characterStrengthDamage(ctx.actor)));
    }

    const difficultylevel = ctx.settings.meleeDifficulty
        ? (item.difficulty ?? 'NONEX_IST_OD6S.DIFFICULTY_EASY')
        : 'NONEX_IST_OD6S.DIFFICULTY_EASY';

    const specSkill =
        ctx.settings.showSkillSpecialization && item.stats?.specialization === input.name
            ? item.stats?.skill ?? ''
            : '';

    return {
        damagetype: weaponDamageType,
        damagescore,
        stundamagetype: item.stun?.type ?? '',
        stundamagescore,
        damagemodifiers,
        source: item.name ?? '',
        // Range LABEL, not the per-band table (which is on input.range). The
        // distance-to-target resolution (via bucketRangeFromDistance) happens
        // downstream — handler emits the rules-default initial label.
        range: input.subtype === 'meleeattack'
            ? 'NONEX_IST_OD6S.RANGE_POINT_BLANK_SHORT'
            : 'NONEX_IST_OD6S.RANGE_SHORT_SHORT',
        difficultylevel,
        only_stun: onlyStun,
        can_stun: canStun,
        // `stun` is a legacy duplicate of `only_stun` in RollData. Phase 3 cleanup.
        stun: onlyStun,
        // Weapon scale of 0 falls back to the actor's scale (matches the
        // original truthy guard at roll-setup.ts: weapon.system.scale.score is
        // only assigned when truthy, otherwise actor scale is read elsewhere).
        attackerScale: item.scale?.score || actorScale(ctx.actor),
        specSkill,
    };
}

const weaponHandler: Handler<'weapon'> = (input, ctx) => buildWeaponBucket(input, ctx);

const starshipWeaponHandler: Handler<'starship-weapon'> = (input, ctx) =>
    buildWeaponBucket(input, ctx);

const vehicleWeaponHandler: Handler<'vehicle-weapon'> = (input, ctx) => ({
    ...buildWeaponBucket(input, ctx),
    vehicle: vehicleUuidForActor(ctx.actor),
});

// ---- Action family helpers ----

const characterAttributes = (actor: ActorView): Record<string, { score: number }> =>
    isCharacterView(actor) ? actor.attributes ?? {} : {};

const characterAttributeScore = (actor: ActorView, key: string): number =>
    characterAttributes(actor)[key]?.score ?? 0;

const actorScale = (actor: ActorView): number => actor.scale?.score ?? 0;

const vehicleScaleForActor = (actor: ActorView, ctx: HandlerContext): number =>
    isVehicleView(actor)
        ? actor.scale?.score ?? 0
        : ctx.vehicleStats?.scale?.score ?? 0;

const vehicleRamForActor = (
    actor: ActorView,
    ctx: HandlerContext,
): { ram: number; ramDamage: number } =>
    isVehicleView(actor)
        ? { ram: actor.ram?.score ?? 0, ramDamage: actor.ram_damage?.score ?? 0 }
        : {
            ram: ctx.vehicleStats?.ram?.score ?? 0,
            ramDamage: ctx.vehicleStats?.ram_damage?.score ?? 0,
        };

const defaultDifficultyLabel = (settings: RollSettingsView): string =>
    settings.defaultUnknownDifficulty ? 'NONEX_IST_OD6S.DIFFICULTY_UNKNOWN' : 'NONEX_IST_OD6S.DIFFICULTY_EASY';

// ---- Action handlers ----

const actionAttributeHandler: Handler<'action-attribute'> = (input, ctx) => ({
    score: characterAttributeScore(ctx.actor, input.attribute ?? ''),
});

const actionOtherHandler: Handler<'action-other'> = () => ({});

const actionRangedAttackHandler: Handler<'action-rangedattack'> = (_input, ctx) => ({
    score: characterAttributeScore(ctx.actor, 'agi'),
    range: 'NONEX_IST_OD6S.RANGE_SHORT_SHORT',
    difficultylevel: defaultDifficultyLabel(ctx.settings),
    attackerScale: actorScale(ctx.actor),
});

const actionVehicleRangedAttackHandler: Handler<'action-vehiclerangedattack'> = (_input, ctx) => ({
    score: characterAttributeScore(ctx.actor, 'mec'),
    range: 'NONEX_IST_OD6S.RANGE_SHORT_SHORT',
    difficultylevel: defaultDifficultyLabel(ctx.settings),
    attackerScale: vehicleScaleForActor(ctx.actor, ctx),
    vehicle: vehicleUuidForActor(ctx.actor),
});

const actionMeleeAttackHandler: Handler<'action-meleeattack'> = (_input, ctx) => ({
    score: ctx.actionSkillResolved?.score ?? 0,
    attackerScale: actorScale(ctx.actor),
    damagescore: characterStrengthDamage(ctx.actor),
});

const actionBrawlAttackHandler: Handler<'action-brawlattack'> = (_input, ctx) => {
    const str = characterStrengthDamage(ctx.actor);
    return {
        score: ctx.actionSkillResolved?.score ?? 0,
        attackerScale: actorScale(ctx.actor),
        damagetype: 'p',
        damagescore: str,
        stundamagetype: 'p',
        stundamagescore: str,
        can_stun: true,
    };
};

const actionVehicleRamAttackHandler: Handler<'action-vehicleramattack'> = (_input, ctx) => {
    const { ram, ramDamage } = vehicleRamForActor(ctx.actor, ctx);
    const contribution = ramAttackContribution(ram, ramDamage);
    const damagemodifiers: Modifier[] = [];
    if (contribution.modifier) damagemodifiers.push(contribution.modifier);
    return {
        damagetype: 'p',
        damagemodifiers,
        source: 'NONEX_IST_OD6S.COLLISION',
        attackerScale: vehicleScaleForActor(ctx.actor, ctx),
        vehicle: vehicleUuidForActor(ctx.actor),
    };
};

const actionVehicleRangedWeaponAttackHandler: Handler<'action-vehiclerangedweaponattack'> = (input, ctx) => {
    // B2: character-fallback path. crew-vehicle.ts (rolling a vehicle weapon
    // from a character pilot's sheet) passes the weapon's damage/damage_type/
    // name on IncomingRollData when the embedded vehicle weapon item can't be
    // resolved on the character actor. The adapter doesn't see an item; the
    // handler reads from `input` instead. Vehicle scale comes from
    // ctx.vehicleStats (orchestrator pre-resolved at the boundary).
    if (!ctx.item) {
        return {
            damagetype: input.damage_type ?? '',
            damagescore: input.damage ?? 0,
            source: input.name ?? '',
            range: 'NONEX_IST_OD6S.RANGE_SHORT_SHORT',
            difficultylevel: defaultDifficultyLabel(ctx.settings),
            attackerScale: vehicleScaleForActor(ctx.actor, ctx),
            vehicle: vehicleUuidForActor(ctx.actor),
        };
    }
    const item = ctx.item;
    const baseDamage = item.damage?.score ?? 0;
    const modded = applyWeaponMods(
        { damageScore: baseDamage, miscMod: 0, bonusmod: 0 },
        {
            damage: item.mods?.damage ?? 0,
            attack: item.mods?.attack ?? 0,
            difficulty: item.mods?.difficulty ?? 0,
        },
    );
    return {
        damagetype: item.damage?.type ?? '',
        damagescore: modded.damageScore,
        source: item.name ?? '',
        range: 'NONEX_IST_OD6S.RANGE_SHORT_SHORT',
        difficultylevel: defaultDifficultyLabel(ctx.settings),
        // Truthy fallback to vehicle scale — matches the legacy guard.
        attackerScale: item.scale?.score || vehicleScaleForActor(ctx.actor, ctx),
        vehicle: vehicleUuidForActor(ctx.actor),
    };
};

const resistanceVehicleToughnessHandler: Handler<'resistance-vehicletoughness'> = (input, ctx) => ({
    scaledice: scaleToDice(input, ctx),
    vehicle: vehicleUuidForActor(ctx.actor),
});

export const HANDLERS = {
    'weapon': weaponHandler,
    'starship-weapon': starshipWeaponHandler,
    'vehicle-weapon': vehicleWeaponHandler,

    'action-meleeattack': actionMeleeAttackHandler,
    'action-brawlattack': actionBrawlAttackHandler,
    'action-rangedattack': actionRangedAttackHandler,
    'action-vehiclerangedattack': actionVehicleRangedAttackHandler,
    'action-vehiclerangedweaponattack': actionVehicleRangedWeaponAttackHandler,
    'action-vehicleramattack': actionVehicleRamAttackHandler,
    'action-attribute': actionAttributeHandler,
    'action-other': actionOtherHandler,

    'skill': skillHandler,
    'skill-dodge': skillDodgeHandler,
    'specialization': specializationHandler,

    'damage': damageHandler,
    'resistance': resistanceHandler,
    'resistance-vehicletoughness': resistanceVehicleToughnessHandler,

    'mortally_wounded': mortallyWoundedHandler,
    'incapacitated': incapacitatedHandler,

    'funds': fundsHandler,
    'purchase': purchaseHandler,

    'attribute': attributeHandler,
} as const satisfies { [K in RollTypeKey]: Handler<K> };
