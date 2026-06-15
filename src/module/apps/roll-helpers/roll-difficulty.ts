/**
 * Difficulty and damage modifier calculation engines.
 */
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {selectHighestDefense} from "./difficulty-math";
import {isCharacterActor, isVehicleActor} from "../../system/type-guards";
import type {Modifier} from "./difficulty-math";
import type {RollData} from "./roll-data";
import {debug} from "../../system/logger";

export async function getDifficulty(rollData: RollData): Promise<number> {
    const result = await getDifficultyImpl(rollData);
    debug('difficulty', 'base difficulty', {
        subtype: rollData.subtype,
        type: rollData.type,
        target: rollData.target?.actor?.name,
        difficulty: result,
    });
    return result;
}

async function getDifficultyImpl(rollData: RollData): Promise<number> {
    if (rollData.isExplosive && rollData.range === 'NONEX_IST_OD6S.RANGE_POINT_BLANK_SHORT' && !game.settings.get('nonex-ist-od6s','map_range_to_difficulty')) {
        return 5;
    }

    switch (rollData.subtype) {
        case 'vehiclemaneuver':
            if (OD6S.vehicleDifficulty) {
                return OD6S.vehicle_speeds[rollData.vehiclespeed].mod
            } else {
                return await od6sutilities.getDifficultyFromLevel(rollData.vehicleterraindifficulty)
            }
        case 'vehicleramattack': {
            const targetActor = rollData.target?.actor;
            const targetDodge = targetActor && (isCharacterActor(targetActor) || isVehicleActor(targetActor))
                ? targetActor.system.dodge?.score ?? 0
                : 0;
            if (OD6S.vehicleDifficulty) {
                if (targetDodge > 0) {
                    return (+targetDodge) + (+OD6S.vehicle_speeds[rollData.vehiclespeed].mod);
                } else {
                    return (+OD6S.vehicle_speeds[rollData.vehiclespeed].mod);
                }
            } else {
                if (targetDodge > 0) {
                    return (+targetDodge) + (await od6sutilities.getDifficultyFromLevel(rollData.vehicleterraindifficulty));
                } else {
                    return await od6sutilities.getDifficultyFromLevel(rollData.vehicleterraindifficulty);
                }
            }
        }
        case 'vehiclerangedattack':
        case 'vehiclerangedweaponattack':
        case 'rangedattack': {
            const targetActor = rollData.target?.actor;
            const targetDodge = targetActor && (isCharacterActor(targetActor) || isVehicleActor(targetActor))
                ? targetActor.system.dodge?.score ?? 0
                : 0;
            if (targetDodge > 0) {
                return (+targetDodge);
            } else {
                if (OD6S.mapRange) {
                    return await od6sutilities.getDifficultyFromLevel(OD6S.ranges[rollData.modifiers.range].map);
                }
                return OD6S.baseRangedAttackDifficulty;
            }
        }
        case 'meleeattack': {
            const targetActor = rollData.target?.actor;
            if (targetActor && isCharacterActor(targetActor)) {
                const targetSys = targetActor.system;

                if (OD6S.defenseLock) {
                    if (targetSys.parry.score === 0) {
                        if (OD6S.meleeDifficulty) {
                            return await od6sutilities.getDifficultyFromLevel(rollData.difficultylevel);
                        } else {
                            return OD6S.baseMeleeAttackDifficulty;
                        }
                    } else {
                        return targetSys.parry.score;
                    }
                }

                if (targetSys.block.score === 0 && targetSys.dodge.score === 0 && targetSys.parry.score === 0) {
                    if (OD6S.meleeDifficulty) {
                        return await od6sutilities.getDifficultyFromLevel(rollData.difficultylevel);
                    } else {
                        return OD6S.baseMeleeAttackDifficulty;
                    }
                } else {
                    return selectHighestDefense({
                        dodge: targetSys.dodge.score,
                        parry: targetSys.parry.score,
                        block: targetSys.block.score,
                    });
                }
            } else if (targetActor && isVehicleActor(targetActor)) {
                const vehicleDefense = targetActor.system.maneuverability.score;
                if (vehicleDefense === 0) {
                    if (OD6S.meleeDifficulty) {
                        return await od6sutilities.getDifficultyFromLevel(rollData.difficultylevel);
                    } else {
                        return OD6S.baseMeleeAttackDifficulty;
                    }
                } else {
                    return vehicleDefense;
                }
            } else {
                return OD6S.meleeDifficulty ? await od6sutilities.getDifficultyFromLevel(rollData.difficultylevel) : OD6S.baseMeleeAttackDifficulty;
            }
        }
        case 'brawlattack': {
            const targetActor = rollData.target?.actor;
            if (targetActor && isCharacterActor(targetActor)) {
                const targetSys = targetActor.system;

                if (OD6S.defenseLock) {
                    if (targetSys.block.score === 0) {
                        if (OD6S.meleeDifficulty) {
                            return await od6sutilities.getDifficultyFromLevel(OD6S.baseBrawlAttackDifficultyLevel);
                        } else {
                            return OD6S.baseBrawlAttackDifficulty;
                        }
                    } else {
                        return targetSys.block.score;
                    }
                }

                if (targetSys.block.score === 0 && targetSys.dodge.score === 0 && targetSys.parry.score === 0) {
                    if (OD6S.meleeDifficulty) {
                        return await od6sutilities.getDifficultyFromLevel(OD6S.baseBrawlAttackDifficultyLevel);
                    } else {
                        return OD6S.baseBrawlAttackDifficulty;
                    }
                } else {
                    return selectHighestDefense({
                        dodge: targetSys.dodge.score,
                        parry: targetSys.parry.score,
                        block: targetSys.block.score,
                    });
                }
            } else if (targetActor && isVehicleActor(targetActor)) {
                const vehicleDefense = targetActor.system.maneuverability.score;
                if (vehicleDefense === 0) {
                    if (OD6S.meleeDifficulty) {
                        return await od6sutilities.getDifficultyFromLevel(OD6S.baseBrawlAttackDifficultyLevel);
                    } else {
                        return OD6S.baseBrawlAttackDifficulty;
                    }
                } else {
                    return vehicleDefense;
                }
            } else {
                return OD6S.meleeDifficulty ? await od6sutilities.getDifficultyFromLevel(OD6S.baseBrawlAttackDifficultyLevel) : OD6S.baseBrawlAttackDifficulty;
            }
        }

        default:
    }

    switch (rollData.type) {
        case 'resistance':
        case 'dodge':
        case 'parry':
        case 'block':
            return 0;

        default:
            return await od6sutilities.getDifficultyFromLevel(rollData.difficultylevel);
    }
}

export function applyDifficultyEffects(rollData: RollData): Modifier[] {
    const mods = rollData.modifiers;
    const difficultyModifiers: Modifier[] = [];
    const modifiers: Modifier[] = [];

    if (rollData.subtype === 'rangedattack' ||
        rollData.subtype === 'vehiclerangedattack' ||
        rollData.subtype === 'vehiclerangedweaponattack') {
        if (!OD6S.mapRange && OD6S.ranges[mods.range].difficulty) {
            modifiers.push({
                "name": game.i18n.localize(OD6S.ranges[mods.range].name),
                "value": OD6S.ranges[mods.range].difficulty
            })
        }

        if (OD6S.rangedAttackOptions[mods.attackoption].attack) {
            let value;
            if (OD6S.rangedAttackOptions[mods.attackoption].multi) {
                value = OD6S.rangedAttackOptions[mods.attackoption].attack * (rollData.shots - 1);
            } else {
                value = OD6S.rangedAttackOptions[mods.attackoption].attack;
            }

            modifiers.push({
                "name": game.i18n.localize(mods.attackoption),
                "value": value
            })
        }
    }

    if (rollData.subtype === 'vehiclemaneuver' || rollData.subtype === 'vehicleramattack') {
        if (OD6S.vehicleDifficulty) {
            if (OD6S.terrain_difficulty[rollData.vehicleterraindifficulty].mod) {
                modifiers.push({
                    "name": game.i18n.localize(rollData.vehicleterraindifficulty),
                    "value": OD6S.terrain_difficulty[rollData.vehicleterraindifficulty].mod
                })
            }
        } else {
            if (OD6S.vehicle_speeds[rollData.vehiclespeed].mod) {
                modifiers.push({
                    "name": game.i18n.localize("NONEX_IST_OD6S.VEHICLE_SPEED") + "(" +
                        game.i18n.localize(OD6S.vehicle_speeds[rollData.vehiclespeed].name) + ")",
                    "value": OD6S.vehicle_speeds[rollData.vehiclespeed].mod
                })
            }
        }
    }

    if (rollData.subtype === 'vehicleramattack') {
        modifiers.push({
            "name": game.i18n.localize("NONEX_IST_OD6S.ACTION_VEHICLE_RAM"),
            "value": 10
        })
    }

    if (rollData.subtype === 'meleeattack') {
        if (!OD6S.meleeDifficulty && OD6S.ranges[mods.range].difficulty) {
            modifiers.push({
                "name": game.i18n.localize(OD6S.ranges[mods.range].name),
                "value": OD6S.ranges[mods.range].difficulty
            })
        }

        if (OD6S.meleeAttackOptions[mods.attackoption].attack) {
            modifiers.push({
                "name": game.i18n.localize(mods.attackoption),
                "value": OD6S.meleeAttackOptions[mods.attackoption].attack
            })
        }
    }

    if (rollData.subtype === 'brawlattack') {
        if (!OD6S.meleeDifficulty && OD6S.ranges[mods.range].difficulty) {
            modifiers.push({
                "name": game.i18n.localize(OD6S.ranges[mods.range].name),
                "value": OD6S.ranges[mods.range].difficulty
            })
        }

        if (OD6S.brawlAttackOptions[mods.attackoption].attack) {
            modifiers.push({
                "name": game.i18n.localize(mods.attackoption),
                "value": OD6S.brawlAttackOptions[mods.attackoption].attack
            })
        }
    }

    if (mods.cover !== '' && OD6S.cover["NONEX_IST_OD6S.COVER"][mods.cover].modifier !== 0) {
        modifiers.push({
            "name": game.i18n.localize(mods.cover),
            "value": OD6S.cover["NONEX_IST_OD6S.COVER"][mods.cover].modifier
        })
    }

    if (mods.coverlight !== '' && OD6S.cover["NONEX_IST_OD6S.COVER_LIGHT"][mods.coverlight].modifier !== 0) {
        modifiers.push({
            "name": game.i18n.localize(mods.coverlight),
            "value": OD6S.cover["NONEX_IST_OD6S.COVER_LIGHT"][mods.coverlight].modifier
        })
    }

    if (mods.coversmoke !== '' && OD6S.cover["NONEX_IST_OD6S.COVER_SMOKE"][mods.coversmoke].modifier !== 0) {
        modifiers.push({
            "name": game.i18n.localize(mods.coversmoke),
            "value": OD6S.cover["NONEX_IST_OD6S.COVER_SMOKE"][mods.coversmoke].modifier
        })
    }

    if (mods.calledshot !== '' && OD6S.calledShot[mods.calledshot].modifier !== 0) {
        modifiers.push({
            "name": game.i18n.localize('NONEX_IST_OD6S.CALLED_SHOT') + "-" + game.i18n.localize(mods.calledshot),
            "value": OD6S.calledShot[mods.calledshot].modifier
        })
    }

    if (mods.scalemod !== 0) {
        if (!game.settings.get('nonex-ist-od6s', 'dice_for_scale')) {
            modifiers.push({
                "name": game.i18n.localize("NONEX_IST_OD6S.SCALE"),
                "value": mods.scalemod
            })
        }
    }

    if (mods.miscmod !== 0) {
        modifiers.push({
            "name": game.i18n.localize("NONEX_IST_OD6S.MISC"),
            "value": mods.miscmod
        })
    }

    modifiers.forEach(m => {
        difficultyModifiers.push(m);
    })
    debug('difficulty', 'modifiers', {
        subtype: rollData.subtype,
        modifiers: difficultyModifiers.map(m => `${m.name}=${m.value}`),
    });
    return difficultyModifiers;
}

export function applyDamageEffects(rollData: RollData): Modifier[] {
    const mods = rollData.modifiers;
    const modifiers: Modifier[] = [];

    if (rollData.subtype === 'rangedattack' ||
        rollData.subtype === 'vehiclerangedattack' ||
        rollData.subtype === 'vehiclerangedweaponattack') {
        if (OD6S.rangedAttackOptions[mods.attackoption].damage) {
            let value;
            if (OD6S.rangedAttackOptions[mods.attackoption].multi) {
                value = OD6S.rangedAttackOptions[mods.attackoption].damage * (rollData.shots - 1);
            } else {
                value = OD6S.rangedAttackOptions[mods.attackoption].damage;
            }

            modifiers.push({
                "name": mods.attackoption,
                "value": value
            })
        }
    }

    if (rollData.subtype === 'meleeattack') {
        if (OD6S.meleeAttackOptions[mods.attackoption].damage) {
            modifiers.push({
                "name": mods.attackoption,
                "value": OD6S.meleeAttackOptions[mods.attackoption].damage
            })
        }
    }

    if (rollData.subtype === 'brawlattack') {
        if (OD6S.brawlAttackOptions[mods.attackoption].damage) {
            modifiers.push({
                "name": mods.attackoption,
                "value": OD6S.brawlAttackOptions[mods.attackoption].damage
            })
        }
    }

    if (mods.calledshot !== '' && OD6S.calledShot[mods.calledshot].damage !== 0) {
        modifiers.push({
            "name": game.i18n.localize('NONEX_IST_OD6S.CALLED_SHOT') + "-" + game.i18n.localize(mods.calledshot),
            "value": 0,
            "pips": OD6S.calledShot[mods.calledshot].damage,
        })
    }

    if (mods.scalemod !== 0) {
        modifiers.push({
            "name": game.i18n.localize("NONEX_IST_OD6S.SCALE"),
            "value": mods.scalemod
        })
    }

    return modifiers;
}
