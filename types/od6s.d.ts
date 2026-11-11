/**
 * OD6S-specific augmentations layered on top of `types/foundry.d.ts`.
 *
 * Strategy: declare ambient interfaces with the same name as the Foundry
 * classes so TypeScript merges the additional members into the existing
 * class declaration. This is global scope (no imports/exports), matching
 * `foundry.d.ts`.
 *
 * Coverage focus is the OD6S subclass surface that drives `as any` casts
 * elsewhere in the codebase.
 */

// ---- Actor system data shapes ----

interface OD6SAttributeField {
    label: string;
    short_label: string;
    base: number;
    mod: number;
    score: number;
    max?: number;
    min?: number;
    /** Derived "<n>D+<p>" display text, refreshed each `prepareDerivedData`. */
    text?: string;
}

interface OD6SModScoreField {
    label: string;
    short_label?: string;
    mod: number;
    score: number;
    /** Derived "<n>D+<p>" display text, refreshed each `applyMods`. */
    text?: string;
}

interface OD6SModField {
    label: string;
    short_label?: string;
    mod: number;
}

interface OD6SScoreField {
    label: string;
    score: number;
}

interface OD6SWoundsField {
    value: number;
    body_points: { max: number; current: number };
}

interface OD6SAttributes {
    agi: OD6SAttributeField;
    str: OD6SAttributeField;
    mec: OD6SAttributeField;
    kno: OD6SAttributeField;
    per: OD6SAttributeField;
    tec: OD6SAttributeField;
    met: OD6SAttributeField;
    /** World-defined custom attributes from the `custom_attributes` setting (#199). */
    [key: string]: OD6SAttributeField;
}

/**
 * Snapshot shape of a vehicle/starship weapon stored on a crewmember's
 * `system.vehicle.vehicle_weapons` array. Built by `crew-vehicle.ts:sendVehicleData`
 * via `Item#toObject()` plus an injected `id`, so these are plain data records,
 * not real `Item` documents — `getFlag` / `update` etc. are not available.
 */
interface VehicleWeaponSnapshot {
    _id: string;
    id: string;
    name: string;
    /** Snapshots are produced from `vehicle-weapon` and `starship-weapon` items only. */
    type: "vehicle-weapon" | "starship-weapon" | string;
    img?: string;
    /**
     * Snapshots come from `item.toObject()` on vehicle-weapon / starship-weapon
     * items, both backed by `OD6SVehicleWeaponsFields`-shaped systems — not the
     * regular character-weapon `OD6SWeaponItemSystem`.
     */
    system: OD6SVehicleWeaponItemSystem | OD6SStarshipWeaponItemSystem;
    flags?: Record<string, unknown>;
}

/** System data shared by character, npc, and creature actor types. */
interface OD6SCharacterSystem {
    attributes: OD6SAttributes;
    wounds: OD6SWoundsField;
    stuns: { value: number; current: number; rounds: number };
    strengthdamage: OD6SModScoreField;
    ranged: OD6SModField;
    melee: OD6SModField;
    brawl: OD6SModField;
    dodge: OD6SModScoreField;
    parry: OD6SModScoreField;
    block: OD6SModScoreField;
    pr: OD6SModScoreField;
    er: OD6SModScoreField;
    /** Derived "no armor" resistance, recomputed each `applyMods`. */
    noArmor?: OD6SModScoreField;
    credits: { type: string; label: string; value: number };
    funds: { type: string; label: string; score: number };
    sheetmode: { value: string };
    scale: OD6SScoreField;
    initiative: { score: number; mod: number; formula: string };
    use_wild_die: boolean;
    roll_mod: number;
    characterpoints: { value: number };
    fatepoints: { value: number };
    customeffects: {
        skills: Record<string, number>;
        specializations: Record<string, number>;
    };
    /** World-defined header-field values, keyed by `custom_fields` slot id (#199). */
    customfields: Record<string, string | number>;
    /**
     * Crewmember actors carry a snapshot of their vehicle's data, pushed by
     * `actor-helpers/crew-vehicle.ts:sendVehicleData`. Fields mirror the
     * vehicle-common schema; all are optional because the proxy is built
     * field-by-field at runtime.
     */
    vehicle: {
        uuid: string;
        name?: string;
        type?: string;
        move?: { value: number; type: string; label: string };
        maneuverability?: { score: number; type: string; label: string };
        toughness?: { score: number; type: string; label: string };
        armor?: { score: number; type: string; label: string };
        crewmembers?: Array<{ uuid: string; name?: string }>;
        attribute?: OD6SVehicleStringField;
        skill?: OD6SVehicleStringField;
        specialization?: OD6SVehicleStringField;
        damage?: { value: string; type: string; label: string };
        shields?: Record<string, unknown>;
        scale?: OD6SScoreField;
        sensors?: Record<string, unknown>;
        dodge?: { score: number; mod: number; type: string; label: string };
        ranged?: { score: number; type: string; label: string };
        ranged_damage?: { score: number; type: string; label: string };
        ram?: { score: number; type: string; label: string };
        ram_damage?: { score: number; type: string; label: string };
        vehicle_weapons?: VehicleWeaponSnapshot[];
        items?: unknown;
    };
    /** Container actors expose a per-player visibility flag. */
    visible?: boolean;
    /** Created marker on character actors. */
    created?: { value: boolean };
    /** Character profile fields (some shared with vehicles via the common schema). */
    chartype: { type: string; label: string; content: string };
    species: { type: string; label: string; content: string };
    move: { type: string; label: string; mod: number; value: number };
    background: { type: string; label: string; content: string };
    metaphysicsextranormal: { type: string; label: string; value: boolean };
}

/** System data for the container actor type. */
interface OD6SContainerSystem {
    itemtypes: {
        armor: boolean;
        weapon: boolean;
        gear: boolean;
        cybernetics: boolean;
        vehicle_weapons: boolean;
        vehicle_gear: boolean;
        starship_weapons: boolean;
        starship_gear: boolean;
    };
    merchant: boolean;
    visible: boolean;
    locked: boolean;
}

/** Top-level `{value, type, label}` shape used for pilot skill/spec/attribute on vehicle actors (per `vehicle-common.ts`). */
interface OD6SVehicleStringField {
    value: string;
    type: string;
    label: string;
}

/** System data for vehicle and starship actor types. */
interface OD6SVehicleSystem {
    attributes: OD6SAttributes;
    /** World-defined header-field values, keyed by `custom_fields` slot id (#199). */
    customfields: Record<string, string | number>;
    sheetmode: { value: string };
    scale: OD6SScoreField;
    toughness: OD6SScoreField;
    armor: OD6SScoreField;
    maneuverability: OD6SScoreField;
    ranged: OD6SScoreField;
    ranged_damage: OD6SScoreField;
    ram: OD6SScoreField;
    ram_damage: OD6SScoreField;
    /** Active reaction-roll dodge score (set by `vehicledodge` rolls). */
    dodge: { score: number; mod: number; type: string; label: string };
    embedded_pilot: { value: boolean };
    crewmembers: Array<{ uuid: string; name?: string }>;
    crew: { value: number };
    /** Vehicle/starship damage state — wound-table key. */
    damage: { value: string };
    /** Pilot attribute key (top-level, from `vehicle-common.ts`). */
    attribute: OD6SVehicleStringField;
    /** Pilot skill name (top-level, from `vehicle-common.ts`). */
    skill: OD6SVehicleStringField;
    /** Pilot specialization name (top-level, from `vehicle-common.ts`). */
    specialization: OD6SVehicleStringField;
    /** Movement speed (top-level, from `vehicle-common.ts`). */
    move: { value: number; type: string; label: string };
    /** Shield state (top-level, from `vehicle-common.ts`). */
    shields: {
        value: number;
        allocated: number;
        type: string;
        label: string;
        skill: string;
        arcs: Record<string, { label: string; value: number; type: string }>;
    };
    /** Sensor state (top-level, from `vehicle-common.ts`). */
    sensors: {
        value: boolean;
        type: string;
        label: string;
        skill: string;
        mod: number;
        types: Record<string, { score: number; range: number; label: string; type: string }>;
    };
    roll_mod: number;
    use_wild_die: boolean;
    /** Initiative state (mirrors `OD6SVehicleCommon.initiative`). */
    initiative: { type: string; label: string; formula: string; mod: number; score: number };
}

// ---- Item system data shapes ----

/** Common to every item subtype: tags/labels/description from `baseSchema`. */
interface OD6SItemBase {
    description: string;
    labels: Record<string, unknown>;
    tags: string[];
    label?: string;
}

/** Mixed in by gear/weapons/armor/cybernetic/etc — `equipmentSchema`. */
interface OD6SEquipment {
    cost: number;
    price: string;
    availability: string;
    quantity: number;
}

/** Mixed in by gear/weapons/armor/cybernetic/etc — `equipSchema`. */
interface OD6SEquip {
    equipped: {
        value: boolean;
        type: string;
        label: string;
        consumable: boolean;
    };
}

/** Mixed in by skill/specialization — `skillFieldsSchema`. */
interface OD6SSkillFields {
    attribute: string;
    min: boolean;
    base: number;
    mod: number;
    score: number;
    time_taken: string;
    isAdvancedSkill: boolean;
    used: { value: boolean };
    /** Derived display value (own score + linked attribute), recomputed each `prepareDerivedData`. */
    total?: number;
    /** Derived "<n>D+<p>" text for `total`. */
    totalText?: string;
}

/** Mixed in by advantage/disadvantage/cybernetic — `advantageFieldsSchema`. */
interface OD6SAdvantageFields {
    attribute: string;
    skill: string;
    value: string;
}

/** Mixed in by vehicle-weapon/starship-weapon — `vehicleWeaponsFieldsSchema`. */
interface OD6SVehicleWeaponsFields {
    scale: { type: string; score: number };
    damaged: number;
    ammo: { type: string; value: number };
    arc: { type: string; value: string };
    crew: { type: string; value: number };
    attribute: { type: string; value: string };
    skill: { type: string; value: string };
    specialization: { type: string; value: string };
    fire_control: { type: string; score: number };
    range: { short: number; medium: number; long: number };
    damage: { type: string; score: number };
    linked: { type: string; value: number };
    difficulty: number;
    mods: { difficulty: number; attack: number; damage: number };
}

/** Common across vehicle/starship actors and the `vehicle` item — `vehicleCommonSchema`. */
interface OD6SVehicleCommon {
    vehicle_type: { value: string; type: string; label: string };
    initiative: { type: string; label: string; formula: string; mod: number; score: number };
    damage: { value: string; type: string; label: string };
    scale: { score: number; type: string; label: string };
    maneuverability: { score: number; type: string; label: string };
    toughness: { score: number; type: string; label: string };
    armor: { score: number; type: string; label: string };
    move: { value: number; type: string; label: string };
    cargo_capacity: { value: number; type: string; label: string };
    cost: { value: number; type: string; label: string };
    price: { value: string; type: string; label: string };
    crew: { value: number; type: string; label: string };
    crewmembers: Array<{ uuid: string; name?: string }>;
    passengers: { value: number; type: string; label: string };
    skill: { value: string; type: string; label: string };
    specialization: { value: string; type: string; label: string };
    attribute: { value: string; type: string; label: string };
    dodge: { score: number; mod: number; type: string; label: string };
    sensors: {
        value: boolean;
        type: string;
        label: string;
        skill: string;
        mod: number;
        types: Record<string, { score: number; range: number; label: string; type: string }>;
    };
    shields: {
        value: number;
        allocated: number;
        type: string;
        label: string;
        skill: string;
        arcs: Record<string, { label: string; value: number; type: string }>;
    };
    ranged: { type: string; label: string; short_label: string; score: number };
    ranged_damage: { type: string; label: string; short_label: string; score: number };
    ram: { type: string; label: string; short_label: string; score: number };
    ram_damage: { type: string; label: string; short_label: string; score: number };
    length: { value: number; type: string; label: string };
    tonnage: { value: number; type: string; label: string };
    embedded_pilot: { value: boolean; type: string; label: string; actor: Record<string, unknown> };
    sheetmode: { type: string; label: string; short_label: string; value: string };
    roll_mod: number;
}

interface OD6SSkillItemSystem extends OD6SItemBase, OD6SSkillFields {}

interface OD6SSpecializationItemSystem extends OD6SItemBase, OD6SSkillFields {
    skill: string;
}

interface OD6SAdvantageItemSystem extends OD6SItemBase, OD6SAdvantageFields {}

interface OD6SDisadvantageItemSystem extends OD6SItemBase, OD6SAdvantageFields {}

interface OD6SSpecialAbilityItemSystem extends OD6SItemBase {}

interface OD6SArmorItemSystem extends OD6SItemBase, OD6SEquipment, OD6SEquip {
    pr: number;
    er: number;
    /**
     * Armor damage level (0-N) used by `setResistance` to subtract a penalty
     * from the equipped DR. Not in the type-data schema — populated from
     * legacy world data / active effects only.
     */
    damaged?: number;
}

interface OD6SWeaponItemSystem extends OD6SItemBase, OD6SEquipment, OD6SEquip {
    scale: { score: number; type: string; label: string };
    subtype: string;
    stats: {
        attribute: string;
        skill: string;
        specialization: string;
        parry_skill: string;
        parry_specialization: string;
    };
    range: { short: string; medium: string; long: string };
    damage: { type: string; score: number; muscle: boolean; str: boolean };
    blast_radius: Record<
        "1" | "2" | "3" | "4",
        { range: number; damage: number; stun_range: number; stun_damage: number }
    >;
    damaged: number;
    ammo: number;
    ammo_price: string;
    ammo_cost: number;
    rof: number;
    stun: { stun_only: boolean; score: number; type: string };
    difficulty: string;
    mods: { difficulty: number; attack: number; damage: number };
}

interface OD6SGearItemSystem extends OD6SItemBase, OD6SEquipment, OD6SEquip {
    quantity: number;
    consumable: boolean;
}

interface OD6SCyberneticItemSystem
    extends OD6SItemBase,
        OD6SAdvantageFields,
        OD6SEquipment,
        OD6SEquip {
    location: string;
    slots: number;
}

interface OD6SManifestationItemSystem extends OD6SItemBase {
    attack: boolean;
    activate: boolean;
    active: boolean;
    roll: boolean;
    skills: Record<
        "channel" | "sense" | "transform",
        { value: boolean; difficulty: string; rolled: boolean }
    >;
}

/**
 * Entry shape for `system.items` arrays carried by item-group / template items.
 * The runtime objects also accumulate ad-hoc keys, so an index signature is included.
 */
interface OD6STemplateItemEntry {
    name: string;
    type: string;
    description?: string;
    [key: string]: unknown;
}

interface OD6SCharacterTemplateItemSystem extends OD6SItemBase {
    species: string;
    attributes: Record<"agi" | "str" | "kno" | "mec" | "per" | "tec" | "met", number>;
    fp: number;
    cp: number;
    funds: number;
    credits: number;
    move: number;
    me: boolean;
    items: OD6STemplateItemEntry[];
}

interface OD6SActionItemSystem extends OD6SItemBase {
    rollable: boolean;
    type: string;
    subtype: string;
    itemId: string;
}

interface OD6SVehicleItemSystem extends OD6SVehicleCommon, OD6SItemBase {
    cover: { value: string; type: string; label: string };
    altitude: { value: number; type: string; label: string };
}

/**
 * Runtime-derived fields populated by `OD6SItem.prepareDerivedData` for
 * vehicle-weapon and starship-weapon items.
 */
interface OD6SVehicleWeaponDerivedFields {
    /** Snapshot of the {attribute,skill,specialization} `.value`s as plain strings. */
    stats: { attribute: string; skill: string; specialization: string };
    /** Always `'vehiclerangedweaponattack'` at present. */
    subtype: string;
}

interface OD6SVehicleWeaponItemSystem
    extends OD6SItemBase,
        OD6SEquipment,
        OD6SEquip,
        OD6SVehicleWeaponsFields,
        OD6SVehicleWeaponDerivedFields {}

interface OD6SVehicleGearItemSystem extends OD6SItemBase, OD6SEquipment, OD6SEquip {
    quantity: number;
    consumable: boolean;
}

interface OD6SStarshipWeaponItemSystem
    extends OD6SItemBase,
        OD6SEquipment,
        OD6SEquip,
        OD6SVehicleWeaponsFields,
        OD6SVehicleWeaponDerivedFields {
    "area-units": { type: string; value: number; label: string };
    mass: { type: string; value: number; label: string };
    energy: { type: string; value: number; label: string };
}

interface OD6SStarshipGearItemSystem extends OD6SItemBase, OD6SEquipment, OD6SEquip {
    quantity: number;
    consumable: boolean;
}

interface OD6SSpeciesTemplateItemSystem extends OD6SItemBase {
    attributes: Record<"agi" | "str" | "kno" | "mec" | "per" | "tec" | "met", { min: number; max: number }>;
    items: OD6STemplateItemEntry[];
}

interface OD6SItemGroupSystem extends OD6SItemBase {
    actor_types: string[];
    items: OD6STemplateItemEntry[];
}

/** Discriminated union of all 18 OD6S item subtype system shapes. */
type OD6SItemSystem =
    | OD6SSkillItemSystem
    | OD6SSpecializationItemSystem
    | OD6SAdvantageItemSystem
    | OD6SDisadvantageItemSystem
    | OD6SSpecialAbilityItemSystem
    | OD6SArmorItemSystem
    | OD6SWeaponItemSystem
    | OD6SGearItemSystem
    | OD6SCyberneticItemSystem
    | OD6SManifestationItemSystem
    | OD6SCharacterTemplateItemSystem
    | OD6SActionItemSystem
    | OD6SVehicleItemSystem
    | OD6SVehicleWeaponItemSystem
    | OD6SVehicleGearItemSystem
    | OD6SStarshipWeaponItemSystem
    | OD6SStarshipGearItemSystem
    | OD6SSpeciesTemplateItemSystem
    | OD6SItemGroupSystem;

// ---- Discriminated type literals ----

/** All actor subtypes registered in `nonex-ist-od6s.ts`. */
type OD6SActorType = "character" | "npc" | "creature" | "vehicle" | "starship" | "container";

/** All item subtypes registered in `nonex-ist-od6s.ts`. */
type OD6SItemType =
    | "skill"
    | "specialization"
    | "advantage"
    | "disadvantage"
    | "specialability"
    | "armor"
    | "weapon"
    | "gear"
    | "cybernetic"
    | "manifestation"
    | "character-template"
    | "action"
    | "vehicle"
    | "vehicle-weapon"
    | "vehicle-gear"
    | "starship-weapon"
    | "starship-gear"
    | "species-template"
    | "item-group";

// ---- Actor: OD6SActor methods ----

interface Actor {
    /** Narrowed to OD6S actor subtypes for type-switch narrowing. */
    type: OD6SActorType;

    /**
     * Typed union of OD6S actor system shapes. TypeScript can't correlate
     * `type` with `system` through class augmentation, so use the
     * `isCharacterActor` / `isVehicleActor` / `isContainerActor` type guards
     * in `system/type-guards.ts` to narrow at branch points.
     *
     * Note: `OD6SContainerSystem` is intentionally NOT in this union — adding
     * it would force ~30 narrowing fixes across the rules engine that aren't
     * in scope for #57. Container access continues to flow through the
     * `isContainerActor` guard.
     */
    system: OD6SCharacterSystem | OD6SVehicleSystem;

    /** Roll an action defined in OD6S.actions (or vehicle/starship actions). */
    rollAction(actionId: string, msg?: ChatMessage | any): Promise<unknown>;

    /** Roll an attribute by short key (e.g. "agi", "kno"). */
    rollAttribute(attribute: string): Promise<void>;

    /** Score text rendered for an action button on the sheet. */
    getActionScoreText(action: string): string | undefined;

    /** Numeric vehicle action score for maneuver/dodge/ram/ranged_attack. */
    getVehicleActionScore(action: string): number | undefined;

    /** Score text for vehicle actions. */
    getVehicleActionScoreText(action: string): string | undefined;

    /** Apply equipped-item / active-effect mods to actor scores. */
    applyMods(): void;

    /** Recalculate the strength damage bonus on this actor. */
    setStrengthDamageBonus(): void;

    /** Recalculate initiative score. */
    setInitiative(): void;

    /** Recalculate physical/energy/no-armor resistance. */
    setResistance(type: 'pr' | 'er' | 'noArmor'): void;

    /** Apply incoming damage; updates BP / wound levels. */
    applyDamage(damage: any): Promise<unknown>;

    /** Compute new damage level given a damage value. */
    calculateNewDamageLevel(damage: any): unknown;

    /** Apply incoming wounds; updates wound state. */
    applyWounds(wound: any): Promise<unknown>;

    /** Compute new wound level from incoming wound value. */
    calculateNewWoundLevel(wound: any): unknown;

    /** First wound level entry from a deadliness table. */
    findFirstWoundLevel(table: any, wound: any): unknown;

    /** Look up the wound-level descriptor matching current body points. */
    getWoundLevelFromBodyPoints(bp?: number): any;

    /** Sync the wound-level state from current body points. */
    setWoundLevelFromBodyPoints(bp: number): Promise<unknown>;

    /** Trigger a mortally wounded check on this actor. */
    triggerMortallyWoundedCheck(): Promise<unknown>;

    /** Apply the failure outcome of a mortally-wounded check. */
    applyMortallyWoundedFailure(): Promise<unknown>;

    /** Apply the failure outcome of an incapacitated check. */
    applyIncapacitatedFailure(): Promise<unknown>;

    /** Crew/vehicle relationships. */
    addEmbeddedPilot(pilotActor: Actor): Promise<unknown>;
    addToCrew(vehicleId: string): Promise<unknown>;
    removeFromCrew(vehicleID: string): Promise<unknown>;
    forceRemoveCrewmember(crewID: string): Promise<unknown>;
    isCrewMember(): boolean;
    _verifyAddToCrew(currentVehicleId: string, newVehicleId: string): Promise<unknown>;

    /** Send updated vehicle data to other clients via socket. */
    sendVehicleData(uuid?: string): Promise<unknown>;

    /** Vehicle/starship combat helpers. */
    modifyShields(update: any): Promise<unknown>;
    vehicleCollision(): Promise<unknown>;
    onCargoHoldItemCreate(event: Event | any): Promise<unknown>;

    /** Spend a character point to modify a chat-message roll. */
    useCharacterPointOnRoll(message: ChatMessage | any): Promise<unknown>;
}

// ---- Item: OD6SItem methods ----

interface Item {
    /** Narrowed to OD6S item subtypes for type-switch narrowing. */
    type: OD6SItemType;

    /**
     * Typed union of OD6S item subtype system shapes. Use `item.type` to
     * narrow before accessing type-specific fields, or cast to the relevant
     * `OD6S<Type>ItemSystem` at access sites.
     */
    system: OD6SItemSystem;

    /** Numeric score (skill / spec / weapon score), depends on subtype. */
    getScore(): number | undefined;

    /** "<dice>D+<pips>" formatted score. */
    getScoreText(): string | undefined;

    /** Parry score text for weapons. */
    getParryText(): string | undefined;

    /** Apply this item's active effects in-place to its `system` data. */
    findActiveEffects(): void;

    /** Recompute derived score from base + mod. */
    applyMods(): void;
}

// ---- ChatMessage: OD6S custom properties ----

/**
 * Properties OD6S sets on chat messages at runtime (in opposed-roll
 * generation, etc.). Foundry's ChatMessage doesn't declare these — they
 * are de-facto custom flag-style fields. Marked optional for safety.
 */
interface ChatMessage {
    /** Type of the speaking actor (set during opposed-roll handling). */
    actorType?: OD6SActorType | "system";

    /** Display name for the speaker, swapped to vehicle name in vehicle rolls. */
    flavorName?: string;

    /** Short alias for the speaker (set during message preparation). */
    alias?: string;
}

// ---- User: target tracking ----

interface User {
    /** Tokens currently targeted by this user. */
    targets: Set<Token>;
}

// ---- Discriminated actor/item unions ----
//
// TypeScript class augmentation can't correlate `Actor.type` with `Actor.system`,
// so these intersection types pair them up explicitly. Use the type guards in
// `src/module/system/type-guards.ts` to narrow at runtime — call sites then get
// `system` typed without an `as` cast.

type OD6SCharacterActor = Actor & {
    type: "character" | "npc" | "creature";
    system: OD6SCharacterSystem;
};

type OD6SVehicleActor = Actor & {
    type: "vehicle" | "starship";
    system: OD6SVehicleSystem;
};

type OD6SContainerActor = Actor & {
    type: "container";
    system: OD6SContainerSystem;
};

type OD6SAnyActor = OD6SCharacterActor | OD6SVehicleActor | OD6SContainerActor;

type OD6SSkillItem = Item & { type: "skill"; system: OD6SSkillItemSystem };
type OD6SSpecializationItem = Item & { type: "specialization"; system: OD6SSpecializationItemSystem };
type OD6SAdvantageItem = Item & { type: "advantage"; system: OD6SAdvantageItemSystem };
type OD6SDisadvantageItem = Item & { type: "disadvantage"; system: OD6SDisadvantageItemSystem };
type OD6SSpecialAbilityItem = Item & { type: "specialability"; system: OD6SSpecialAbilityItemSystem };
type OD6SArmorItem = Item & { type: "armor"; system: OD6SArmorItemSystem };
type OD6SWeaponItem = Item & { type: "weapon"; system: OD6SWeaponItemSystem };
type OD6SGearItem = Item & { type: "gear"; system: OD6SGearItemSystem };
type OD6SCyberneticItem = Item & { type: "cybernetic"; system: OD6SCyberneticItemSystem };
type OD6SManifestationItem = Item & { type: "manifestation"; system: OD6SManifestationItemSystem };
type OD6SCharacterTemplateItem = Item & { type: "character-template"; system: OD6SCharacterTemplateItemSystem };
type OD6SActionItem = Item & { type: "action"; system: OD6SActionItemSystem };
type OD6SVehicleItem = Item & { type: "vehicle"; system: OD6SVehicleItemSystem };
type OD6SVehicleWeaponItem = Item & { type: "vehicle-weapon"; system: OD6SVehicleWeaponItemSystem };
type OD6SVehicleGearItem = Item & { type: "vehicle-gear"; system: OD6SVehicleGearItemSystem };
type OD6SStarshipWeaponItem = Item & { type: "starship-weapon"; system: OD6SStarshipWeaponItemSystem };
type OD6SStarshipGearItem = Item & { type: "starship-gear"; system: OD6SStarshipGearItemSystem };
type OD6SSpeciesTemplateItem = Item & { type: "species-template"; system: OD6SSpeciesTemplateItemSystem };
type OD6SItemGroupItem = Item & { type: "item-group"; system: OD6SItemGroupSystem };

type OD6SAnyItem =
    | OD6SSkillItem
    | OD6SSpecializationItem
    | OD6SAdvantageItem
    | OD6SDisadvantageItem
    | OD6SSpecialAbilityItem
    | OD6SArmorItem
    | OD6SWeaponItem
    | OD6SGearItem
    | OD6SCyberneticItem
    | OD6SManifestationItem
    | OD6SCharacterTemplateItem
    | OD6SActionItem
    | OD6SVehicleItem
    | OD6SVehicleWeaponItem
    | OD6SVehicleGearItem
    | OD6SStarshipWeaponItem
    | OD6SStarshipGearItem
    | OD6SSpeciesTemplateItem
    | OD6SItemGroupItem;
