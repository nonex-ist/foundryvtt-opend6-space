/**
 * Attribute definitions used to render the actor sheet attribute grid.
 * `name` and `shortName` are populated from settings at module init.
 * Mounted onto `NONEX_IST_OD6S.attributes` by `config-od6s.ts`.
 *
 * Only the core attributes are defined here. World-defined custom attributes
 * (the `custom_attributes` setting) are added to the mounted registry by
 * `updateConfig()` — see `config/settings/index.ts` and #199.
 */
export interface AttributeDef {
    name: string;
    shortName: string;
    active: boolean;
    sort: number;
}

export type Attributes = Record<string, AttributeDef>;

const attributes: Attributes = {
    "agi": {
        "name": '',
        "shortName": '',
        "active": true,
        "sort": 0
    },
    "str": {
        "name": '',
        "shortName": '',
        "active": true,
        "sort": 1
    },
    "mec": {
        "name": '',
        "shortName": '',
        "active": true,
        "sort": 2
    },
    "kno": {
        "name": '',
        "shortName": '',
        "active": true,
        "sort": 3
    },
    "per": {
        "name": '',
        "shortName": '',
        "active": true,
        "sort": 4
    },
    "tec": {
        "name": '',
        "shortName": '',
        "active": true,
        "sort": 5
    },
    "met": {
        "name": '',
        "shortName": '',
        "active": true,
        "sort": 10
    }
};

/**
 * Keys of the built-in attributes. `updateConfig()` treats every other key on
 * the mounted registry as a dynamic custom-attribute entry it owns (deleting
 * and rebuilding them from the `custom_attributes` setting).
 */
export const CORE_ATTRIBUTE_KEYS: readonly string[] = Object.keys(attributes);

export default attributes;
