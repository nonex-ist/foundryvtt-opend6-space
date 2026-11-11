import {describe, expect, it} from 'vitest';
import {buildDefenseNames, detectDefenseKind, detectSensorAction} from './roll-defense';

const fr: Record<string, string> = {
    'NONEX_IST_OD6S.PARRY': 'Parade',
    'NONEX_IST_OD6S.MELEE_PARRY': 'Parade au corps a corps',
    'NONEX_IST_OD6S.DODGE': 'Esquive',
    'NONEX_IST_OD6S.BLOCK': 'Blocage',
};
const localize = (k: string) => fr[k] ?? k;

describe('detectDefenseKind', () => {
    const names = buildDefenseNames(localize);
    it('matches localized names', () => {
        expect(detectDefenseKind('Esquive', names)).toBe('dodge');
        expect(detectDefenseKind('Parade au corps a corps', names)).toBe('parry');
        expect(detectDefenseKind('Blocage', names)).toBe('block');
    });
    it('matches English compendium names', () => {
        expect(detectDefenseKind('Melee Parry', names)).toBe('parry');
        expect(detectDefenseKind('Dodge', names)).toBe('dodge');
    });
    it('returns undefined for other skills', () => {
        expect(detectDefenseKind('Pistol', names)).toBeUndefined();
    });
});

describe('detectSensorAction', () => {
    const labels = {passive: 'Passif', scan: 'Scan', search: 'Recherche', focus: 'Focus'};
    it('maps names', () => {
        expect(detectSensorAction('Capteurs: Recherche', labels)).toBe('vehiclesensorssearch');
        expect(detectSensorAction('x', labels)).toBeUndefined();
    });
});
