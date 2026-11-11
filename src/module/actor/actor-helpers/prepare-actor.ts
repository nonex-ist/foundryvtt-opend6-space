import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {computeSkillDisplayScore} from "./skill-score";
import {isCharacterActor, isVehicleActor, isContainerActor} from "../../system/type-guards";

export function prepareBaseActorData(actor: Actor): void {
    // Set all mod values to zero
    if (isCharacterActor(actor)) {
        for (const a in actor.system.attributes) {
            actor.system.attributes[a].mod = 0;
            actor.system.attributes[a].label = OD6S.attributes[a].name;
        }

        const mList = {...OD6S.data_tab.offense, ...OD6S.data_tab.defense};
        for (const m in mList) {
            (actor.system as unknown as Record<string, OD6SModScoreField>)[m].mod = 0;
        }
    }

    if (isVehicleActor(actor)) {
        actor.system.sensors.mod = 0;
        for (const a in actor.system.attributes) {
            actor.system.attributes[a].mod = 0;
            actor.system.attributes[a].label = OD6S.attributes[a].name;
        }
    }

    if (!isVehicleActor(actor) && !isContainerActor(actor) && isCharacterActor(actor)) {
        if (typeof actor.system.use_wild_die === 'undefined') {
            actor.system.use_wild_die = true;
        }
    }
}

export async function prepareDerivedActorData(actor: Actor): Promise<void> {
    if (isCharacterActor(actor)) {
        const actorData = actor.system;
        if (OD6S.woundConfig === 1) {
            actorData.wounds.value = Number(
                Object.keys(
                    Object.fromEntries(
                        Object.entries(OD6S.deadliness[3]).filter(
                            ([_k, v]: [string, { description: string }]) =>
                                v.description === actor.getWoundLevelFromBodyPoints(),
                        ),
                    ),
                )[0],
            );
        } else if (OD6S.woundConfig === 2) {
            actorData.wounds.value = 0;
        }

        // Remove mortally wounded flag if actor is not mortally wounded
        if (actor.getFlag('nonex-ist-od6s', 'mortally_wounded')) {
            if (OD6S.woundsId[od6sutilities.getWoundLevel(actor.system.wounds.value, actor)] !== 'mortally_wounded') {
                await actor.unsetFlag('nonex-ist-od6s', 'mortally_wounded');
            }
        }

        if (actor.type === 'character' || actor.type === 'npc') {
            actor.system.species.label = OD6S.speciesLabelName;
        }

        if (actor.type === 'character') {
            actor.system.chartype.label = OD6S.typeLabel;
        }
    }

    actor.applyMods();

    if (!isContainerActor(actor)) actor.setInitiative();

    // Iterate over custom active effects and handle them
    const changes: ActiveEffectChange[] = [];
    const itemRegex = new RegExp(`^(system)?.?(items)?.?(skill|specialization|weapon|vehicle-weapon|starship-weapon)s?`);

    for (const effect of actor.allApplicableEffects()) {
        if (!effect.active) continue;
        changes.push(...effect.system.changes.filter((c) => c.type === "custom" && !c.key.match(itemRegex)));
    }

    for (const change of changes) {
        if (change.key.match(itemRegex)) continue;
        const changeValue = od6sutilities.evaluateChange(change, actor);
        const origValue = foundry.utils.getProperty(actor, change.key);
        if (typeof origValue === 'undefined' || origValue === null) continue;
        foundry.utils.setProperty(actor, change.key, changeValue + origValue);
        actor.applyMods();
    }

    // Iterate over owned items and apply custom active effects
    for (const i of actor.items.contents) {
        i.findActiveEffects();
        i.applyMods();

        if (i.type === 'skill' || i.type === 'specialization') {
            const skillSystem = i.system as OD6SSkillItemSystem | OD6SSpecializationItemSystem;
            // `system.score` is the canonical own-progression value (base + mod),
            // already reset by `i.applyMods()` above. `system.total` is the display
            // value that includes the linked attribute (and respects flatSkills /
            // advanced-skill rules). Templates and roll-dialog data-score reads
            // should consume `system.total`; roll-formula consumers add the
            // attribute themselves and therefore stay on `system.score`.
            const attrKey = typeof skillSystem.attribute === 'string' ? skillSystem.attribute : undefined;
            const attribute = attrKey && !isContainerActor(actor)
                ? actor.system.attributes?.[attrKey]
                : undefined;
            skillSystem.total = computeSkillDisplayScore({
                base: skillSystem.base,
                mod: skillSystem.mod,
                isAdvancedSkill: i.type === 'skill' && (skillSystem as OD6SSkillItemSystem).isAdvancedSkill,
                attributeScore: attribute?.score,
                flatSkills: OD6S.flatSkills,
            });
            skillSystem.totalText = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(skillSystem.total));
        }
    }

    if (!isContainerActor(actor)) {
        for (const a in actor.system.attributes) {
            const dice = od6sutilities.getDiceFromScore(actor.system.attributes[a].score);
            actor.system.attributes[a].text = `${od6sutilities.getTextFromDice(dice)}`;
        }
    }

    if (isVehicleActor(actor)) {
        if (actor.system.crew.value > 0) {
            await actor.sendVehicleData();
        }
    }
}

export function applyMods(actor: Actor): void {
    if (isContainerActor(actor)) return;
    const actorData = actor.system;

    for (const a in actorData.attributes) {
        actorData.attributes[a].score = actorData.attributes[a].base + actorData.attributes[a].mod;
    }

    if (isCharacterActor(actor)) {
        // Compute after the attribute loop so str.score reflects base+mod.
        actor.system.strengthdamage.score = setStrengthDamageBonus(actor);
        actor.system.pr.score = setResistance(actor, 'pr');
        actor.system.pr.text = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(actor.system.pr.score));
        actor.system.er.score = setResistance(actor, 'er');
        actor.system.er.text = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(actor.system.er.score));
        actor.system.noArmor = {
            label: game.i18n.localize("NONEX_IST_OD6S.RESISTANCE_NO_ARMOR"),
            mod: 0,
            score: setResistance(actor, 'noArmor'),
        };
        actor.system.noArmor.text = od6sutilities.getTextFromDice(od6sutilities.getDiceFromScore(actor.system.noArmor.score));
    }
}

export function setStrengthDamageBonus(actor: Actor): number {
    if (!isCharacterActor(actor)) return 0;
    let damage;

    // If game setting is true, use straight strength score plus modifier
    if (game.settings.get('nonex-ist-od6s', 'strength_damage')) {
        return actor.system.attributes?.str.score + actor.system.strengthdamage?.mod;
    }

    const liftSkill = actor.items.find((skill) => skill.name === OD6S.strDamSkill);
    const liftScore = liftSkill && (liftSkill.type === 'skill' || liftSkill.type === 'specialization')
        ? (liftSkill.system as OD6SSkillItemSystem | OD6SSpecializationItemSystem).score
        : 0;
    const base = liftSkill ? liftScore + actor.system.attributes.str.score : actor.system.attributes.str.score;

    if (game.settings.get('nonex-ist-od6s', 'od6_bonus')) {
        // Use base directly multiplied by the multiplier
        const modifiedBase = base * OD6S.strDamMultiplier;
        damage = OD6S.strDamRound ? Math.floor(modifiedBase) : Math.ceil(modifiedBase);
    } else {
        // Calculate based on dice conversion and then apply half dice logic
        const dice = Math.ceil(base / OD6S.pipsPerDice);
        const halfDice = OD6S.strDamRound ? Math.floor(dice / 2) : Math.ceil(dice / 2);
        damage = halfDice * OD6S.pipsPerDice;
    }

    damage += actor.system.strengthdamage.mod; // Always add modifier to the damage
    return damage;
}

export function setInitiative(actor: Actor): OD6SCharacterSystem | OD6SVehicleSystem | undefined {
    if (isContainerActor(actor)) return;
    if (isVehicleActor(actor) && !actor.system.embedded_pilot.value) return;
    // Base init is the character's perception score.  Special abilities and optional rules may add to it.
    // Using perception can be overridden in system config options
    // 0.7.3 add an option to change the base attribute
    const score = actor.system.attributes[OD6S.initiative.attribute].score + actor.system.initiative.mod;
    const dice = od6sutilities.getDiceFromScore(score);
    const tiebreaker = (+(actor.system.attributes.per.score / 100 + actor.system.attributes.agi.score / 100).toPrecision(2));
    dice.dice--;
    const formula = dice.dice + "d6[Base]" + "+" + dice.pips + "+1d6x6[Wild]+" + tiebreaker;
    actor.system.initiative.formula = formula;
    actor.system.initiative.score = score;
    return actor.system;
}

export type ResistanceKey = 'pr' | 'er' | 'noArmor';

export function setResistance(actor: Actor, type: ResistanceKey): number {
    if (!isCharacterActor(actor)) return 0;
    let dr = 0;

    // Accumulate DR from equipped and undamaged armor
    if (actor.itemTypes.armor && type !== 'noArmor') {
        actor.itemTypes.armor.forEach((armor) => {
            const armorSystem = armor.system as OD6SArmorItemSystem;
            if (armorSystem.equipped.value) {
                dr += (armorSystem as unknown as Record<string, number>)[type];
                if (armorSystem.damaged !== undefined && armorSystem.damaged > 0) {
                    dr -= OD6S.armorDamage[armorSystem.damaged].penalty;
                    dr = Math.max(0, dr);
                }
            }
        });
    }

    if (OD6S.resistanceOption) {
        const staminaItem = actor.items.find((skill) => skill.name === OD6S.resistanceSkill);
        const staminaSystem = staminaItem && (staminaItem.type === 'skill' || staminaItem.type === 'specialization')
            ? (staminaItem.system as OD6SSkillItemSystem | OD6SSpecializationItemSystem)
            : undefined;
        const staminaScore = staminaSystem ? Number(staminaSystem.score) : 0;
        const staminaAttr = staminaSystem ? staminaSystem.attribute : 'str';
        const strScore = Number(actor.system.attributes[staminaAttr].score);

        // Default the resistance multiplier if not set or zero
        if (!OD6S.resistanceMultiplier || OD6S.resistanceMultiplier === 0) {
            OD6S.resistanceMultiplier = 1;
        }

        const damageResistance = OD6S.resistanceRound ?
            Math.floor((staminaScore + strScore) * OD6S.resistanceMultiplier) :
            Math.ceil((staminaScore + strScore) * OD6S.resistanceMultiplier);

        const modField = (actor.system as unknown as Record<string, OD6SModScoreField | undefined>)[type];
        dr += damageResistance + (modField?.mod ?? 0);
    } else {
        const modField = (actor.system as unknown as Record<string, OD6SModScoreField | undefined>)[type];
        dr += actor.system.attributes.str.score + (modField?.mod ?? 0);
    }
    return dr;
}
