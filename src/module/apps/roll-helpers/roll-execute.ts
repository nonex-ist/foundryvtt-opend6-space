/**
 * Roll execution: builds roll string, executes roll, processes results, creates chat messages.
 */
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {getDifficulty, applyDifficultyEffects, applyDamageEffects} from "./roll-difficulty";
import {applyDifficultyModifiers} from "./difficulty-math";
import {isCharacterActor, isVehicleActor, isSkillItem, isSpecializationItem, isWeaponItem} from "../../system/type-guards";
import type {Modifier} from "./difficulty-math";
import type {RollData, RollMessageFlags} from "./roll-data";
import {
    computeHighHitDamage,
    computeWildDieReduction,
    resolveMessageMode,
    applyDicePenalties,
    buildRollString,
    detectWildDieResult,
    assembleDamageDice,
} from "./roll-execute-math";
import {clearExplosivePending, getExplosivePending} from "../../system/utilities/explosives";
import {debug} from "../../system/logger";

export async function executeRollAction(rollData: RollData): Promise<unknown> {
    const actor = rollData.actor
    let rollMin = 0;
    let rollString: string;
    let targetName;
    let targetId;
    let targetType;
    let damageScore = rollData.stun ? rollData.stundamagescore : rollData.damagescore;
    let damageType = rollData.stun ? rollData.stundamagetype : rollData.damagetype;
    let strModDice;
    let doUpdate = false;

    rollData.score = parseInt(rollData.score as unknown as string);

    let baseAttackDifficulty = 10;

    if(rollData.subtype?.includes('attack')) {
        if(rollData.subtype === 'rangedattack') {
            baseAttackDifficulty = OD6S.baseRangedAttackDifficulty;
        } else if(rollData.subtype === 'meleeattack') {
            baseAttackDifficulty = OD6S.baseMeleeAttackDifficulty;
        } else if(rollData.subtype === 'brawlattack') {
            baseAttackDifficulty = OD6S.baseBrawlAttackDifficulty;
        }
    }

    let difficulty;

    if (isCharacterActor(actor)) {
        strModDice = od6sutilities.getDiceFromScore(actor.system.strengthdamage.score);
    }

    rollData.isknown = true;
    const messageMode: string = resolveMessageMode({
        explicit: typeof rollData.rollmode === "string" ? rollData.rollmode : null,
        isGM: !!game.user.isGM,
        hideGmRolls: !!game.settings.get('nonex-ist-od6s', 'hide-gm-rolls'),
    });
    if (rollData.fatepoint) {
        rollData.dice = (+rollData.originaldice * 2);
        rollData.pips = (+rollData.originalpips * 2);
        await actor.setFlag('nonex-ist-od6s', 'fatepointeffect', true)
    }

    if (rollData.scaledice < 0) {
        rollData.otherpenalty += rollData.scaledice;
    }

    if (rollData.type === "resistance" && game.settings.get('nonex-ist-od6s','dice_for_scale')) {
        rollData.dice = (+rollData.dice)+(+rollData.scaledice);
    }

    rollData.dice = applyDicePenalties(+rollData.dice, {
        action: +rollData.actionpenalty,
        wound: +rollData.woundpenalty,
        stunned: +rollData.stunnedpenalty,
        other: +rollData.otherpenalty,
    });

    rollString = buildRollString({
        dice: +rollData.dice,
        pips: +rollData.pips,
        characterpoints: +rollData.characterpoints,
        bonusdice: +rollData.bonusdice,
        bonuspips: +rollData.bonuspips,
        wilddie: !!rollData.wilddie,
        labels: {
            base: game.i18n.localize("NONEX_IST_OD6S.BASE_DIE_FLAVOR"),
            wild: game.i18n.localize("NONEX_IST_OD6S.WILD_DIE_FLAVOR"),
            cp: game.i18n.localize("NONEX_IST_OD6S.CHARACTER_POINT_DIE_FLAVOR"),
            bonus: game.i18n.localize("NONEX_IST_OD6S.BONUS_DIE_FLAVOR"),
        },
    });

    // Apply costs (character points / fate points only exist on character actors)
    if (isCharacterActor(actor)) {
        if ((rollData.characterpoints > 0) && (actor.system.characterpoints.value >= rollData.characterpoints)) {
            doUpdate = true;
            actor.system.characterpoints.value -= rollData.characterpoints;
        }

        if (rollData.fatepoint && (actor.system.fatepoints.value > 0)) {
            doUpdate = true;
            actor.system.fatepoints.value -= 1;
        }
    }

    if (typeof (rollData.target) !== 'undefined') {
        targetName = rollData.target.name;
        targetId = rollData.target.id;
        targetType = rollData.target.actor.type;
    }

    if (rollData.difficulty) {
        difficulty = rollData.difficulty;
    } else {
        difficulty = await getDifficulty(rollData);
    }
    const baseDifficulty = difficulty;
    const modifiers = applyDifficultyEffects(rollData);

    if (rollData.difficultylevel === 'NONEX_IST_OD6S.DIFFICULTY_UNKNOWN') {
        rollData.isvisible = false;
        rollData.isknown = false;
    }

    if (game.settings.get('nonex-ist-od6s', 'hide-skill-cards')) {
        rollData.isknown = false;
    }

    if (rollData.subtype === 'dodge' || rollData.subtype === 'parry' || rollData.subtype === 'block') {
        rollData.isknown = true;
        rollData.isvisible = true;
    }

    const baseForLog = difficulty;
    difficulty = applyDifficultyModifiers(difficulty, modifiers);
    debug('rolls', 'final difficulty', {
        roll: rollData.label,
        base: baseForLog,
        modifiers: modifiers.map((m: Modifier) => `${m.name}=${m.value}`),
        final: difficulty,
    });

    if (rollData.subtype === 'brawlattack' && isCharacterActor(actor)) {
        damageScore = actor.system.strengthdamage.score;
        damageType = 'p';
    }

    const damageEffects = applyDamageEffects(rollData);
    rollData.damagemodifiers = rollData.damagemodifiers.concat(damageEffects);

    const isVehicleRam = rollData.subtype === 'vehicleramattack';
    const damageAssembly = assembleDamageDice({
        damageScore: +damageScore,
        damageModifiers: rollData.damagemodifiers,
        strModDice,
        subtype: rollData.subtype ?? '',
        fatepointInEffect: !!rollData.actor.getFlag('nonex-ist-od6s', 'fatepointeffect'),
        scaleLabel: game.i18n.localize("NONEX_IST_OD6S.SCALE"),
        diceForScale: !!game.settings.get('nonex-ist-od6s', 'dice_for_scale'),
        scaleMod: +rollData.modifiers.scalemod,
        scaleDice: +rollData.scaledice,
        vehicleRamDamage: isVehicleRam ? +OD6S.vehicle_speeds[rollData.vehiclespeed].damage : 0,
        vehicleRamCollisionScore: isVehicleRam ? +OD6S.collision_types[rollData.vehiclecollisiontype].score : 0,
        pipsPerDice: OD6S.pipsPerDice,
    });
    const baseDamage = damageAssembly.baseDamage;
    damageScore = damageAssembly.damageScore;
    const damageDice = damageAssembly.damageDice;
    strModDice = damageAssembly.strModDice ?? strModDice;
    const scaleBonus = damageAssembly.scaleBonus;
    const scaleDice = damageAssembly.scaleDice;

    const flags: RollMessageFlags = {
        "rollMode": messageMode,
        "actorId": rollData.actor.id,
        "targetName": targetName,
        "targetId": targetId,
        "targetType": targetType,
        "baseDifficulty": baseDifficulty,
        "difficulty": difficulty,
        "difficultyLevel": rollData.difficultylevel,
        "baseDamage": baseDamage,
        "damageScore": damageScore,
        "damageDice": damageDice,
        "strModDice": strModDice,
        "damageScaleBonus": scaleBonus,
        "damageScaleDice": scaleDice,
        "damageModifiers": rollData.damagemodifiers,
        "damageType": damageType,
        "damageTypeName": OD6S.damageTypes[damageType],
        "stun": rollData.stun,
        "fatepointineffect": rollData.fatepointeffect,
        "isExplosive": rollData.isExplosive,
        "template": rollData.regionId ?? '',
        "range": rollData.modifiers.range,
        "type": rollData.type,
        "subtype": rollData.subtype ? rollData.subtype : '',
        "multiShot": rollData.multishot,
        "modifiers": modifiers,
        "isEditable": true,
        "editing": false,
        "isVisible": rollData.isvisible,
        "isKnown": rollData.isknown,
        "isOpposable": rollData.isoppasable,
        "wild": false,
        "wildHandled": false,
        "wildResult": OD6S.wildDieResult[OD6S.wildDieOneDefault],
        "canUseCp": rollData.canusecp,
        "specSkill": rollData.specSkill,
        "vehicle": rollData.vehicle,
        "vehiclespeed": rollData.vehiclespeed,
        "vehicleterraindifficulty": rollData.vehicleterraindifficulty,
        "source": rollData.source,
        "location": "",
        "seller": rollData.seller,
        "purchasedItem": '',
        "itemId": rollData.itemid ? rollData.itemid : "",
        "attackerScale": rollData.attackerScale
    }

    if (rollData.itemid) {
        const item = rollData.actor.items.get(rollData.itemid);
        const hasAttributes = isCharacterActor(rollData.actor) || isVehicleActor(rollData.actor);
        if (typeof (item) !== 'undefined') {
            if (isSpecializationItem(item)) {
                const skill = rollData.actor.items.find((i: Item) => i.name === item.system.skill);
                if (skill !== undefined && skill.name !== '' && isSkillItem(skill) && hasAttributes) {
                    if (skill.system.min === true || String(skill.system.min).toLowerCase() === 'true') {
                        rollMin = od6sutilities.getDiceFromScore(item.system.score +
                            rollData.actor.system.attributes[item.system.attribute].score).dice * OD6S.pipsPerDice;
                    }
                }
                if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                    await item.update({'system.used.value': true});
                }
            } else if (isSkillItem(item)) {
                if ((item.system.min === true || String(item.system.min).toLowerCase() === 'true') && hasAttributes) {
                    rollMin = od6sutilities.getDiceFromScore(item.system.score +
                        rollData.actor.system.attributes[item.system.attribute].score).dice * OD6S.pipsPerDice;
                }
                if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                    await item.update({'system.used.value': true});
                }
            } else if (isWeaponItem(item)) {
                let found = false;
                const stats = item.system.stats;
                if (typeof (stats.specialization) !== 'undefined' &&
                    stats.specialization !== 'null' && stats.specialization !== '') {
                    const spec = rollData.actor.items.find((i: Item) => i.type === 'specialization' && i.name === stats.specialization);
                    if (spec !== undefined && spec.name !== '' && isSpecializationItem(spec)) {
                        found = true;
                        const skill = rollData.actor.items.find((i: Item) => i.name === spec.system.skill);
                        if (skill !== undefined && skill.name !== '' && isSkillItem(skill) && hasAttributes) {
                            if (skill.system.min === true || String(skill.system.min).toLowerCase() === 'true') {
                                rollMin = od6sutilities.getDiceFromScore(spec.system.score +
                                    rollData.actor.system.attributes[skill.system.attribute].score).dice * OD6S.pipsPerDice;
                            }
                            if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                                await spec.update({'system.used.value': true});
                            }
                        }
                    }
                }

                if (!found && typeof (stats.skill) !== 'undefined' &&
                    stats.skill !== 'null' && stats.skill !== '') {
                    const skill = rollData.actor.items.find((i: Item) => i.name === stats.skill);
                    if (skill !== undefined && skill.name !== '' && isSkillItem(skill) && hasAttributes) {
                        if (skill.system.min === true || String(skill.system.min).toLowerCase() === 'true') {
                            rollMin = od6sutilities.getDiceFromScore(skill.system.score +
                                rollData.actor.system.attributes[skill.system.attribute].score).dice * OD6S.pipsPerDice;
                        }
                        if(OD6S.skillUsed && OD6S.autoSkillUsed) {
                            await skill.update({'system.used.value': true});
                        }
                    }
                }
            }
        }
        if (rollMin > 0) {
            rollString = "max(" + rollString + "," + rollMin + ")";
        }
    }

    if (rollData.isExplosive) {
        flags.showButton = true;
        if(!game.settings.get('nonex-ist-od6s', 'explosive_end_of_round')) {
            flags.triggered = true;
        }
        if(game.settings.get('nonex-ist-od6s','auto_explosive')
            && !game.settings.get('nonex-ist-od6s','explosive_end_of_round')) {
            flags.targets = await od6sutilities.getExplosiveTargets(
                rollData.actor.isToken ? rollData.actor.token.actor : rollData.actor, rollData.itemid, rollData.regionId
            )
        }
    }

    // Let's roll!
    if (rollString === '') {
        ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.ZERO_DICE'));
        return;
    }

    const roll = await new Roll(rollString).evaluate();

    let label;
    if (OD6S.showSkillSpecialization && rollData.specSkill !== '') {
        label = rollData.label ? `${game.i18n.localize('NONEX_IST_OD6S.ROLLING')} ${rollData.specSkill}: ${rollData.label}` : '';
    } else {
        label = rollData.label ? `${game.i18n.localize('NONEX_IST_OD6S.ROLLING')} ${rollData.label}` : '';
    }

    if (typeof (rollData.vehicle) !== 'undefined' && rollData.vehicle !== ''
        && (rollData.actor.type !== 'vehicle' && rollData.actor.type !== 'starship')) {
        const vehicle = await od6sutilities.getActorFromUuid(rollData.vehicle);
        if (vehicle) {
            label = label + " " + game.i18n.localize('NONEX_IST_OD6S.FOR') + " " + vehicle.name;
        }
    }

    let useWildDie;

    if(!game.settings.get('nonex-ist-od6s', 'use_wild_die')) {
        useWildDie = false;
    } else {
        useWildDie = rollData.wilddie;
    }

    if (useWildDie && rollMin < 1) {
        const detection = detectWildDieResult({
            terms: roll.terms as Array<{ flavor?: string; total?: number }>,
            wildFlavor: game.i18n.localize('NONEX_IST_OD6S.WILD_DIE_FLAVOR').replace(/[[\]]/g, ""),
            wildDieOneDefault: OD6S.wildDieOneDefault,
            wildDieOneAuto: OD6S.wildDieOneAuto,
        });
        flags.wild = detection.wild;
        if (detection.wildHandled) flags.wildHandled = true;
    }

    flags.success = roll.total >= difficulty;
    flags.total = roll.total;
    flags.stun = rollData.stun;

    if (OD6S.randomHitLocations && flags.success) {
        flags.location = OD6S.hitLocations[roll.total.toString().slice(-1)];
    }

    if (rollData.actor.type === 'character' && OD6S.highHitDamage && flags.success) {
        const { extra, asPips } = computeHighHitDamage({
            rollTotal: roll.total,
            difficulty,
            multiplier: OD6S.highHitDamageMultiplier,
            roundDown: OD6S.highHitDamageRound,
            asPips: !OD6S.highHitDamagePipsOrDice,
        });
        if (asPips) {
            flags.damageModifiers.push({ "name": 'NONEX_IST_OD6S.HIGH_HIT_DAMAGE', "value": 0, "pips": extra });
            flags.damageDice.pips += extra;
        } else {
            flags.damageModifiers.push({ "name": 'NONEX_IST_OD6S.HIGH_HIT_DAMAGE', "value": extra, "pips": 0 });
            flags.damageDice.dice += extra;
        }
    }

    if (rollData.modifiers.calledshot && flags.success) {
        switch (rollData.modifiers.calledshot) {
            case 'NONEX_IST_OD6S.CALLED_SHOT_NONE':
            case 'NONEX_IST_OD6S.CALLED_SHOT_LARGE':
            case 'NONEX_IST_OD6S.CALLED_SHOT_MEDIUM':
            case 'NONEX_IST_OD6S.CALLED_SHOT_SMALL':
                flags.location = "";
                break;
            default:
                flags.location = rollData.modifiers.calledshot;
        }

    }
    if (rollMin > 0) {
        label = label + " (" + game.i18n.localize('NONEX_IST_OD6S.SKILL_MINIMUM') + ": " + rollMin + ")";
    }

    const rollMessage = await roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: actor}),
            flavor: label,
            flags: {"nonex-ist-od6s": flags}
        },
        {messageMode, create: true}
    );

    if (flags.wild === true && OD6S.wildDieOneDefault === 2 && OD6S.wildDieOneAuto === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const replacementRoll = JSON.parse(JSON.stringify(rollMessage.rolls[0].toJSON()));
        const { discardedIndex, newTotal } = computeWildDieReduction(
            replacementRoll.terms[0].results,
            replacementRoll.total,
        );
        replacementRoll.terms[0].results[discardedIndex].discarded = true;
        replacementRoll.terms[0].results[discardedIndex].active = false;
        replacementRoll.total = newTotal;
        flags.total = replacementRoll.total;
        const rollMessageUpdate: { content?: number; rolls?: unknown[]; flags?: { "nonex-ist-od6s"?: Partial<RollMessageFlags> } } = {};
        rollMessageUpdate.content = replacementRoll.total;
        rollMessageUpdate.rolls = rollMessage.rolls;
        rollMessageUpdate.rolls[0] = replacementRoll;
        rollMessageUpdate.flags = {};
        rollMessageUpdate.flags["nonex-ist-od6s"] = {};
        const newSuccess = replacementRoll.total >= rollMessage.getFlag('nonex-ist-od6s', 'difficulty')

        if (game.user.isGM) {
            if (rollMessage.getFlag('nonex-ist-od6s', 'difficulty') && rollMessage.getFlag('nonex-ist-od6s', 'success')) {
                rollMessageUpdate.flags["nonex-ist-od6s"].success = newSuccess;
            }
            rollMessageUpdate.flags["nonex-ist-od6s"].originalroll = rollMessage.rolls[0];
            rollMessageUpdate.flags["nonex-ist-od6s"].wildHandled = true;
            await rollMessage.update(rollMessageUpdate);
        } else {
            await OD6S.socket.executeAsGM('updateRollMessage', game.user.id, rollMessage.id, rollMessageUpdate);
        }

        if (rollData.type === 'incapacitated' && !newSuccess && flags.success) {
            await rollData.actor.applyIncapacitatedFailure();
        }

        if (rollData.type === 'mortally_wounded' && !newSuccess && flags.success) {
            await rollData.actor.applyMortallyWoundedFailure();
        }
    }

    if(rollData.isExplosive) {
        const item = rollData.actor.items.find((i: Item) => i.id === rollData.itemid);
        const regionId = rollData.regionId;
        const pending = item && regionId ? getExplosivePending(item, regionId) : undefined;
        const origin = pending?.origin;
        const region = regionId ? canvas.scene.getEmbeddedDocument('Region', regionId) : null;
        if (region) {
            await region.setFlag('nonex-ist-od6s','message', rollMessage.id);

            if(rollData.actor.isToken) {
                await region.setFlag('nonex-ist-od6s','token', rollData.actor.token.id);
            } else {
                await region.setFlag('nonex-ist-od6s','token', '');
            }
        }
        if (game.settings.get('nonex-ist-od6s', 'auto_explosive') && region) {
            await region.setFlag('nonex-ist-od6s', 'originalOwner', game.user.id);
            await region.setFlag('nonex-ist-od6s', 'templateId', rollMessage._id);

            if (!flags.success && origin && regionId) {
                await od6sutilities.scatterExplosive(rollData.range, origin, regionId);
                await od6sutilities.wait(100);
                const newTargets = await od6sutilities.getExplosiveTargets(rollData.actor, rollData.itemid, regionId);
                if (Object.keys(newTargets).length === 0) {
                    await rollMessage.unsetFlag('nonex-ist-od6s', 'showButton');
                    await rollMessage.setFlag('nonex-ist-od6s', 'showButton', false);
                }
                await rollMessage.unsetFlag('nonex-ist-od6s', 'targets');
                await rollMessage.setFlag('nonex-ist-od6s', 'targets', newTargets);
                await od6sutilities.wait(100);
            }
        }
        if (region && !game.settings.get('nonex-ist-od6s', 'explosive_end_of_round')) {
            await region.update({ visibility: 2 });
        }
        if (game.settings.get('nonex-ist-od6s', 'auto_explosive') && item) {
            // Clear only this throw's pending entry so other in-flight throws
            // of the same item document remain resolvable (#40).
            await clearExplosivePending(item, regionId);
        }
    }

    if ((rollData.subtype === 'dodge' || rollData.subtype === 'parry' || rollData.subtype === 'block')
        && isCharacterActor(actor)) {
        doUpdate = true;
        if (rollData.fulldefense) {
            actor.system[rollData.subtype].score = (+(flags.total ?? 0) + baseAttackDifficulty);
        } else {
            actor.system[rollData.subtype].score = +(flags.total ?? 0);
        }
    }

    if (rollData.subtype === 'vehicledodge') {
        let vehicle: Actor | null | undefined;
        let vehicleUuid: string | undefined;
        if (isVehicleActor(rollData.actor)) {
            vehicle = rollData.actor;
            vehicleUuid = rollData.actor.uuid;
        } else if (isCharacterActor(rollData.actor)) {
            vehicleUuid = rollData.actor.system.vehicle.uuid;
            vehicle = await od6sutilities.getActorFromUuid(vehicleUuid);
        }
        const dodgeScore = rollData.fulldefense
            ? (+roll.total + baseAttackDifficulty)
            : (+roll.total);
        const vehicleUpdate: { system: { dodge: { score: number } }; flags?: { "nonex-ist-od6s"?: { dodge_actor?: string } } } = {
            system: { dodge: { score: dodgeScore } },
        };
        if (!game.settings.get("nonex-ist-od6s", "reaction_skills")) {
            vehicleUpdate.flags = { "nonex-ist-od6s": { dodge_actor: actor.uuid } };
        }

        if (game.user.isGM) {
            await vehicle?.update(vehicleUpdate);
        } else if (vehicleUuid) {
            await OD6S.socket.executeAsGM('updateVehicle', game.user.id, vehicleUuid, vehicleUpdate);
        }
    }

    if (doUpdate && isCharacterActor(actor)) {
        const update = {
            system: {
                fatepoints: actor.system.fatepoints,
                characterpoints: actor.system.characterpoints,
                dodge: { score: actor.system.dodge.score },
                parry: { score: actor.system.parry.score },
                block: { score: actor.system.block.score },
            },
        };
        await actor.update(update);
    }

    if (!rollMessage.getFlag('nonex-ist-od6s', 'wildHandled')) {
        if (rollData.type === 'incapacitated' && !rollMessage.getFlag('nonex-ist-od6s', 'success')) {
            await rollData.actor.applyIncapacitatedFailure();
        }

        if (rollData.type === 'mortally_wounded' && !rollMessage.getFlag('nonex-ist-od6s', 'success')) {
            await rollData.actor.applyMortallyWoundedFailure();
        }
    }

    if (rollData.subtype === 'purchase') {
        await rollMessage.setFlag('nonex-ist-od6s', 'purchasedItem', rollData.itemid);
    }

    if (rollData.subtype === 'purchase' && rollMessage.getFlag('nonex-ist-od6s', 'success')) {
        if (!rollMessage.getFlag('nonex-ist-od6s', 'wild')) {
            const seller = game.actors.get(rollData.seller);
            seller!.sheet._onPurchase(rollData.itemid, rollData.actor.id);
        } else if (rollMessage.getFlag('nonex-ist-od6s', 'wildHandled')) {
            const seller = game.actors.get(rollData.seller);
            await seller!.sheet._onPurchase(rollData.itemid, rollData.actor.id);
        }
    }
    await actor.render();
    return await game.messages.render();
}
