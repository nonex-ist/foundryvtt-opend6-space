import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMeleeDamage, getWeaponRange } from './weapons';

describe('getMeleeDamage', () => {
    const meleeActor = (strScore: number | string) =>
        ({ type: 'character', system: { strengthdamage: { score: strScore } } } as unknown as Actor);
    const meleeWeapon = (str: boolean, score: number | string) =>
        ({ type: 'weapon', system: { damage: { str, score } } } as unknown as Item);

    it('adds strength damage when weapon has str flag', () => {
        expect(getMeleeDamage(meleeActor(6), meleeWeapon(true, 12))).toBe(18);
    });

    it('returns weapon damage only when no str flag', () => {
        expect(getMeleeDamage(meleeActor(6), meleeWeapon(false, 12))).toBe(12);
    });

    it('handles zero strength damage', () => {
        expect(getMeleeDamage(meleeActor(0), meleeWeapon(true, 9))).toBe(9);
    });

    it('handles zero weapon damage with str bonus', () => {
        expect(getMeleeDamage(meleeActor(6), meleeWeapon(true, 0))).toBe(6);
    });

    it('coerces string scores via unary plus', () => {
        expect(getMeleeDamage(meleeActor('6'), meleeWeapon(true, '12'))).toBe(18);
    });
});

describe('getWeaponRange', () => {
    const warn = vi.fn();
    const settings = new Map<string, unknown>();
    let rollEvaluate: ReturnType<typeof vi.fn>;
    let rollToMessage: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        warn.mockReset();
        settings.clear();
        // strength_damage truthy so the lift-skill override branch is skipped
        settings.set('strength_damage', true);
        settings.set('static_str_range', true);
        settings.set('hide-gm-rolls', false);

        rollEvaluate = vi.fn(async function (this: { total: number }) { this.total = 12; return this; });
        rollToMessage = vi.fn(async () => undefined);

        vi.stubGlobal('ui', { notifications: { warn } });
        vi.stubGlobal('game', {
            i18n: { localize: (k: string) => k },
            settings: { get: (_ns: string, key: string) => settings.get(key) },
            user: { isGM: false },
        });
        vi.stubGlobal('ChatMessage', { getSpeaker: () => ({}) });
        vi.stubGlobal('Roll', class {
            total = 0;
            constructor(public formula: string) {}
            evaluate = rollEvaluate;
            toMessage = rollToMessage;
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function mockActor(attributes: Record<string, { score: number }>): Actor {
        return {
            type: 'character',
            items: { find: () => undefined },
            system: { attributes },
        } as unknown as Actor;
    }

    function rangeItem(short: string, medium: string, long: string): Item {
        return { type: 'weapon', system: { range: { short, medium, long } } } as unknown as Item;
    }

    it('returns numeric ranges coerced from all-numeric strings', async () => {
        const actor = mockActor({ agi: { score: 9 } });
        const item = rangeItem('5', '10', '20');
        await expect(getWeaponRange(actor, item)).resolves.toEqual({
            short: 5,
            medium: 10,
            long: 20,
        });
        expect(warn).not.toHaveBeenCalled();
    });

    it('resolves attribute-relative ranges in static mode (AGI score 9 → 12 base)', async () => {
        // pipsPerDice=3, score 9 → 3D+0 → static = 3*4+0 = 12; with offsets: 12, 14, 11
        const actor = mockActor({ agi: { score: 9 } });
        const item = rangeItem('AGI', 'AGI+2', 'AGI-1');
        await expect(getWeaponRange(actor, item)).resolves.toEqual({
            short: 12,
            medium: 14,
            long: 11,
        });
    });

    it('resolves a different attribute (STR score 12 → 16 base)', async () => {
        // score 12 → 4D+0 → static = 4*4+0 = 16
        const actor = mockActor({ str: { score: 12 } });
        const item = rangeItem('STR', 'STR+2', 'STR-1');
        await expect(getWeaponRange(actor, item)).resolves.toEqual({
            short: 16,
            medium: 18,
            long: 15,
        });
    });

    it('warns and returns false when attributes differ across short/medium/long', async () => {
        const actor = mockActor({ agi: { score: 9 }, str: { score: 12 } });
        const item = rangeItem('AGI', 'STR+2', 'AGI');
        await expect(getWeaponRange(actor, item)).resolves.toBe(false);
        expect(warn).toHaveBeenCalledWith('NONEX_IST_OD6S.WARN_INVALID_RANGE_ATTRIBUTE');
    });

    it('warns and returns false when range string contains no known attribute', async () => {
        const actor = mockActor({ agi: { score: 9 } });
        const item = rangeItem('XYZ+1', '10', '20');
        await expect(getWeaponRange(actor, item)).resolves.toBe(false);
        expect(warn).toHaveBeenCalledWith('NONEX_IST_OD6S.WARN_INVALID_RANGE_ATTRIBUTE');
    });

    it('uses Roll and posts a chat message when static_str_range is off', async () => {
        settings.set('static_str_range', false);
        const actor = mockActor({ agi: { score: 9 } });
        const item = { ...rangeItem('AGI', 'AGI+2', 'AGI-1'), name: 'Blaster' } as unknown as Item;
        // mocked roll.total = 12 → with offsets: 12, 14, 11
        await expect(getWeaponRange(actor, item)).resolves.toEqual({
            short: 12,
            medium: 14,
            long: 11,
        });
        expect(rollEvaluate).toHaveBeenCalledTimes(1);
        expect(rollToMessage).toHaveBeenCalledTimes(1);
        // Pin the v14 call shape: messageMode and create must be in the
        // options arg (second), not inside messageData (first). If they
        // leak back into messageData, Foundry silently ignores them and
        // the GM hide-rolls setting becomes a no-op (issue #76).
        const [messageData, options] = rollToMessage.mock.calls[0];
        expect(messageData).not.toHaveProperty('messageMode');
        expect(messageData).not.toHaveProperty('create');
        expect(options).toEqual({messageMode: 'public', create: true});
    });

    it('uses gm message mode when GM has hide-gm-rolls enabled', async () => {
        settings.set('static_str_range', false);
        settings.set('hide-gm-rolls', true);
        vi.stubGlobal('game', {
            i18n: { localize: (k: string) => k },
            settings: { get: (_ns: string, key: string) => settings.get(key) },
            user: { isGM: true },
        });
        const actor = mockActor({ agi: { score: 9 } });
        const item = { ...rangeItem('AGI', 'AGI+2', 'AGI-1'), name: 'Blaster' } as unknown as Item;
        await getWeaponRange(actor, item);
        const [, options] = rollToMessage.mock.calls[0];
        expect(options).toEqual({messageMode: 'gm', create: true});
    });
});
