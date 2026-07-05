import { describe, it, expect } from 'vitest';
import {
    computeHighHitDamage,
    computeWildDieReduction,
    resolveMessageMode,
    applyDicePenalties,
    buildRollString,
    detectWildDieResult,
    assembleDamageDice,
} from './roll-execute-math';

describe('computeHighHitDamage', () => {
    it('returns 0 when the roll fails to meet difficulty', () => {
        expect(computeHighHitDamage({
            rollTotal: 10, difficulty: 15, multiplier: 5, roundDown: true, asPips: false,
        })).toEqual({ extra: 0, asPips: false });
    });

    it('returns 0 on an exact tie (difference is zero)', () => {
        expect(computeHighHitDamage({
            rollTotal: 15, difficulty: 15, multiplier: 5, roundDown: true, asPips: false,
        })).toEqual({ extra: 0, asPips: false });
    });

    it('rounds down when configured to round down', () => {
        // diff = 9, multiplier = 5 → 9/5 = 1.8 → floor = 1
        expect(computeHighHitDamage({
            rollTotal: 24, difficulty: 15, multiplier: 5, roundDown: true, asPips: false,
        })).toEqual({ extra: 1, asPips: false });
    });

    it('rounds up when configured to round up', () => {
        // diff = 9, multiplier = 5 → 9/5 = 1.8 → ceil = 2
        expect(computeHighHitDamage({
            rollTotal: 24, difficulty: 15, multiplier: 5, roundDown: false, asPips: false,
        })).toEqual({ extra: 2, asPips: false });
    });

    it('passes asPips through to the result', () => {
        expect(computeHighHitDamage({
            rollTotal: 20, difficulty: 10, multiplier: 5, roundDown: true, asPips: true,
        }).asPips).toBe(true);
    });

    it('returns 0 when multiplier is non-positive (defensive)', () => {
        expect(computeHighHitDamage({
            rollTotal: 24, difficulty: 15, multiplier: 0, roundDown: true, asPips: false,
        }).extra).toBe(0);
    });

    it('handles a clean integer division', () => {
        // diff = 10, multiplier = 5 → exactly 2 (no rounding ambiguity)
        const down = computeHighHitDamage({
            rollTotal: 25, difficulty: 15, multiplier: 5, roundDown: true, asPips: false,
        });
        const up = computeHighHitDamage({
            rollTotal: 25, difficulty: 15, multiplier: 5, roundDown: false, asPips: false,
        });
        expect(down.extra).toBe(2);
        expect(up.extra).toBe(2);
    });
});

describe('computeWildDieReduction', () => {
    it('finds and discards the highest base die', () => {
        const dice = [
            { result: 3, active: true },
            { result: 6, active: true },
            { result: 4, active: true },
        ];
        // original total includes wild die 1: 3+6+4+1 = 14
        const r = computeWildDieReduction(dice, 14);
        expect(r.discardedIndex).toBe(1);
        // 14 - 6 (discarded) - 1 (wild) = 7
        expect(r.newTotal).toBe(7);
    });

    it('picks the first occurrence when ties exist', () => {
        const dice = [
            { result: 5, active: true },
            { result: 5, active: true },
            { result: 2, active: true },
        ];
        const r = computeWildDieReduction(dice, 13);
        expect(r.discardedIndex).toBe(0);
        expect(r.newTotal).toBe(7); // 13 - 5 - 1
    });

    it('handles a single base die', () => {
        const dice = [{ result: 4, active: true }];
        const r = computeWildDieReduction(dice, 5); // 4 + 1
        expect(r.discardedIndex).toBe(0);
        expect(r.newTotal).toBe(0); // 5 - 4 - 1
    });
});

describe('resolveMessageMode', () => {
    it('defaults to public for non-GM with no explicit choice', () => {
        expect(resolveMessageMode({ isGM: false, hideGmRolls: false })).toBe('public');
        expect(resolveMessageMode({ isGM: false, hideGmRolls: true })).toBe('public');
    });

    it('switches to gm for a GM with hide-gm-rolls enabled', () => {
        expect(resolveMessageMode({ isGM: true, hideGmRolls: true })).toBe('gm');
    });

    it('stays public for a GM without hide-gm-rolls', () => {
        expect(resolveMessageMode({ isGM: true, hideGmRolls: false })).toBe('public');
    });

    it('explicit dialog choice always wins over hide-gm-rolls', () => {
        // Pin the contract for issue #77's footer mode selector: even a GM
        // who has hide-gm-rolls on can still pick public/blind/self
        // and have it stick.
        expect(resolveMessageMode({ explicit: 'public', isGM: true, hideGmRolls: true })).toBe('public');
        expect(resolveMessageMode({ explicit: 'blind',  isGM: true, hideGmRolls: true })).toBe('blind');
        expect(resolveMessageMode({ explicit: 'self',   isGM: true, hideGmRolls: true })).toBe('self');
        expect(resolveMessageMode({ explicit: 'gm',     isGM: false, hideGmRolls: false })).toBe('gm');
    });

    it('treats empty/null explicit as no choice', () => {
        expect(resolveMessageMode({ explicit: '', isGM: true, hideGmRolls: true })).toBe('gm');
        expect(resolveMessageMode({ explicit: null, isGM: false, hideGmRolls: false })).toBe('public');
    });
});

describe('applyDicePenalties', () => {
    it('subtracts every penalty bucket from the pool', () => {
        expect(applyDicePenalties(10, { action: 1, wound: 2, stunned: 1, other: 0 })).toBe(6);
    });
    it('returns the pool unchanged when all penalties are zero', () => {
        expect(applyDicePenalties(7, { action: 0, wound: 0, stunned: 0, other: 0 })).toBe(7);
    });
    it('may go negative (caller decides what to do)', () => {
        expect(applyDicePenalties(2, { action: 1, wound: 2, stunned: 1, other: 0 })).toBe(-2);
    });
});

describe('buildRollString', () => {
    const labels = { base: '[base]', wild: '[wild]', cp: '[cp]', bonus: '[bonus]' };

    it('builds the basic dice formula without wild die', () => {
        expect(buildRollString({
            dice: 4, pips: 0, characterpoints: 0, bonusdice: 0, bonuspips: 0,
            wilddie: false, labels,
        })).toBe('4d6[base]');
    });

    it('returns empty string when the pool is empty (no wild die)', () => {
        expect(buildRollString({
            dice: 0, pips: 0, characterpoints: 0, bonusdice: 0, bonuspips: 0,
            wilddie: false, labels,
        })).toBe('');
    });

    it('reserves one die for the wild die when wilddie=true', () => {
        // dice=4, wild=true → 3 base + 1 wild
        expect(buildRollString({
            dice: 4, pips: 0, characterpoints: 0, bonusdice: 0, bonuspips: 0,
            wilddie: true, labels,
        })).toBe('3d6[base]+1dw[wild]');
    });

    it('emits just the wild die when only one die is available', () => {
        expect(buildRollString({
            dice: 1, pips: 0, characterpoints: 0, bonusdice: 0, bonuspips: 0,
            wilddie: true, labels,
        })).toBe('1dw[wild]');
    });

    it('appends pips, character-point dice, bonus dice, bonus pips in that order', () => {
        expect(buildRollString({
            dice: 3, pips: 2, characterpoints: 1, bonusdice: 1, bonuspips: 1,
            wilddie: false, labels,
        })).toBe('3d6[base]+2+1db[cp]+1d6[bonus]+1');
    });

    it('wraps in max() when rollMin > 0', () => {
        expect(buildRollString({
            dice: 3, pips: 0, characterpoints: 0, bonusdice: 0, bonuspips: 0,
            wilddie: false, rollMin: 5, labels,
        })).toBe('max(3d6[base],5)');
    });

    it('does not wrap in max() when rollMin is 0 or undefined', () => {
        const noWrap = buildRollString({
            dice: 3, pips: 0, characterpoints: 0, bonusdice: 0, bonuspips: 0,
            wilddie: false, rollMin: 0, labels,
        });
        expect(noWrap).toBe('3d6[base]');
    });

    it('does not wrap an empty formula in max() — caller should short-circuit on empty', () => {
        // Pinning the contract: empty pool + rollMin must NOT produce `max(,5)`,
        // which Foundry's Roll cannot parse. Empty stays empty so the caller
        // notifies "zero dice" and bails.
        expect(buildRollString({
            dice: 0, pips: 0, characterpoints: 0, bonusdice: 0, bonuspips: 0,
            wilddie: false, rollMin: 5, labels,
        })).toBe('');
    });
});

describe('detectWildDieResult', () => {
    it('returns wild=false when no wild-flavored term is present', () => {
        expect(detectWildDieResult({
            terms: [{ flavor: 'base', total: 6 }],
            wildFlavor: 'wild', wildDieOneDefault: 1, wildDieOneAuto: 0,
        })).toEqual({ wild: false, wildHandled: false });
    });

    it('returns wild=false when the wild die did not roll a 1', () => {
        expect(detectWildDieResult({
            terms: [{ flavor: 'wild', total: 6 }, { flavor: 'base', total: 12 }],
            wildFlavor: 'wild', wildDieOneDefault: 1, wildDieOneAuto: 0,
        })).toEqual({ wild: false, wildHandled: false });
    });

    it('marks wild=true when the wild term total is 1', () => {
        const r = detectWildDieResult({
            terms: [{ flavor: 'wild', total: 1 }],
            wildFlavor: 'wild', wildDieOneDefault: 1, wildDieOneAuto: 0,
        });
        expect(r.wild).toBe(true);
        expect(r.wildHandled).toBe(true);
    });

    it('leaves wildHandled=false when default is 0 (no auto-effect configured)', () => {
        const r = detectWildDieResult({
            terms: [{ flavor: 'wild', total: 1 }],
            wildFlavor: 'wild', wildDieOneDefault: 0, wildDieOneAuto: 0,
        });
        expect(r).toEqual({ wild: true, wildHandled: false });
    });

    it('leaves wildHandled=false when auto > 0 (player chooses, GM resolves)', () => {
        const r = detectWildDieResult({
            terms: [{ flavor: 'wild', total: 1 }],
            wildFlavor: 'wild', wildDieOneDefault: 1, wildDieOneAuto: 1,
        });
        expect(r).toEqual({ wild: true, wildHandled: false });
    });
});

describe('assembleDamageDice', () => {
    // pipsPerDice=3 matches the OD6S default in tests/dice.test.ts.
    const base = {
        damageScore: 9,        // 3d
        damageModifiers: [],
        subtype: 'rangedattack',
        fatepointInEffect: false,
        scaleLabel: 'Scale',
        diceForScale: false,
        scaleMod: 0,
        scaleDice: 0,
        pipsPerDice: 3,
    };

    it('returns the unmodified score when no modifiers are present', () => {
        const r = assembleDamageDice({ ...base });
        expect(r).toEqual({
            baseDamage: 9,
            damageScore: 9,
            damageDice: { dice: 3, pips: 0 },
            strModDice: undefined,
            scaleBonus: 0,
            scaleDice: 0,
        });
    });

    it('adds modifier value to damageScore', () => {
        const r = assembleDamageDice({
            ...base,
            damageModifiers: [{ name: 'NONEX_IST_OD6S.RANGE_MOD', value: 3 }],
        });
        expect(r.damageScore).toBe(12);
        expect(r.damageDice).toEqual({ dice: 4, pips: 0 });
    });

    it('captures scale as a flat bonus when diceForScale=false', () => {
        const r = assembleDamageDice({
            ...base,
            damageModifiers: [{ name: 'Scale', value: 6 }],
        });
        expect(r.damageScore).toBe(9);
        expect(r.scaleBonus).toBe(6);
        expect(r.scaleDice).toBe(0);
    });

    it('rolls scale into damageScore when diceForScale=true', () => {
        const r = assembleDamageDice({
            ...base,
            damageModifiers: [{ name: 'Scale', value: 6 }],
            diceForScale: true,
        });
        expect(r.damageScore).toBe(15);
        expect(r.scaleBonus).toBe(0);
    });

    it('surfaces scaleDice when diceForScale=true and scaleMod is non-positive', () => {
        const r = assembleDamageDice({ ...base, diceForScale: true, scaleMod: 0, scaleDice: 2 });
        expect(r.scaleDice).toBe(2);
    });

    it('skips STRENGTH_DAMAGE_BONUS modifier when fatepoint is in effect, then doubles strModDice', () => {
        const r = assembleDamageDice({
            ...base,
            damageScore: 6, // 2d
            damageModifiers: [{ name: 'NONEX_IST_OD6S.STRENGTH_DAMAGE_BONUS', value: 3 }],
            strModDice: { dice: 1, pips: 0 },
            fatepointInEffect: true,
        });
        // value=3 NOT applied; instead strModDice doubled and added
        expect(r.damageScore).toBe(6);
        expect(r.damageDice).toEqual({ dice: 4, pips: 0 }); // 2d + 1d*2 = 4d
        expect(r.strModDice).toEqual({ dice: 2, pips: 0 });
    });

    it('vehicleramattack adds speed/collision bonus and recomputes from the new score', () => {
        const r = assembleDamageDice({
            ...base,
            damageScore: 9,
            subtype: 'vehicleramattack',
            vehicleRamDamage: 6,
            vehicleRamCollisionScore: 3,
        });
        expect(r.baseDamage).toBe(18); // 9 + 6 + 3
        expect(r.damageDice).toEqual({ dice: 6, pips: 0 });
    });

    it('adds modifier pips to damageDice', () => {
        const r = assembleDamageDice({
            ...base,
            damageModifiers: [{ name: 'NONEX_IST_OD6S.HIGH_HIT_DAMAGE', value: 0, pips: 2 }],
        });
        expect(r.damageDice).toEqual({ dice: 3, pips: 2 });
    });
});
