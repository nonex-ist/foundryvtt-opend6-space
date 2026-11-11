/**
 * Pure helpers that recognise defensive / sensor rolls from a display name.
 *
 * Skill and action items carry no structured "this is a parry" field for
 * skill-based defenses, so the name is the only discriminator. To stay correct
 * under non-English clients we match against the *localized* labels the system
 * itself uses, plus the English base names (compendium skill items are authored
 * in English and are not translated). No Foundry globals here.
 */

export type DefenseKind = 'parry' | 'dodge' | 'block';

export type DefenseNames = Record<DefenseKind, readonly string[]>;

/** i18n keys whose localized text identifies each defense kind. */
export const DEFENSE_NAME_KEYS: Record<DefenseKind, readonly string[]> = {
    parry: ['NONEX_IST_OD6S.PARRY', 'NONEX_IST_OD6S.MELEE_PARRY', 'NONEX_IST_OD6S.BRAWLING_PARRY'],
    dodge: ['NONEX_IST_OD6S.DODGE'],
    block: ['NONEX_IST_OD6S.BLOCK', 'NONEX_IST_OD6S.ACTION_BRAWL_BLOCK'],
};

const ENGLISH_BASE: DefenseNames = {
    parry: ['Parry'],
    dodge: ['Dodge'],
    block: ['Block'],
};

/** Builds the candidate-name table (localized + English) for {@link detectDefenseKind}. */
export function buildDefenseNames(localize: (key: string) => string): DefenseNames {
    const out = {} as Record<DefenseKind, string[]>;
    for (const kind of Object.keys(DEFENSE_NAME_KEYS) as DefenseKind[]) {
        const names = new Set<string>(ENGLISH_BASE[kind]);
        for (const key of DEFENSE_NAME_KEYS[kind]) {
            const text = localize(key);
            if (text && text !== key) names.add(text);
        }
        out[kind] = [...names];
    }
    return out;
}

/** Order matches the legacy check: parry, then dodge, then block. */
export function detectDefenseKind(title: string, names: DefenseNames): DefenseKind | undefined {
    const lower = (title ?? '').toLowerCase();
    for (const kind of ['parry', 'dodge', 'block'] as const) {
        if (names[kind].some((n) => n && lower.includes(n.toLowerCase()))) return kind;
    }
    return undefined;
}

export type SensorAction =
    'vehiclesensorspassive' | 'vehiclesensorsscan' | 'vehiclesensorssearch' | 'vehiclesensorsfocus';

/** Maps a vehicle sensor action item's name to its action id, using localized sensor labels. */
export function detectSensorAction(
    itemName: string,
    labels: { passive: string; scan: string; search: string; focus: string },
): SensorAction | undefined {
    if (itemName.includes(labels.passive)) return 'vehiclesensorspassive';
    if (itemName.includes(labels.scan)) return 'vehiclesensorsscan';
    if (itemName.includes(labels.search)) return 'vehiclesensorssearch';
    if (itemName.includes(labels.focus)) return 'vehiclesensorsfocus';
    return undefined;
}
