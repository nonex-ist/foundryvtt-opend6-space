import {describe, expect, it} from "vitest";
import {
    freshSlotId,
    legacyCustomAttributeDefs,
    legacyCustomFieldDefs,
    normalizeCustomAttributeDefs,
    normalizeCustomFieldDefs,
    visibleCustomFields,
} from "./custom-slots";

// Mirrors OD6S.actorMasks: character:0, npc:1, creature:2, vehicle:3, starship:4
const MASKS = {character: 0, npc: 1, creature: 2, vehicle: 3, starship: 4};

const field = (overrides: object = {}) => ({
    id: "cf1",
    name: "Reputation",
    short: "Rep",
    type: "string" as const,
    actorTypes: 1,
    ...overrides,
});

describe("normalizeCustomFieldDefs", () => {
    it("returns [] for non-array input", () => {
        expect(normalizeCustomFieldDefs(undefined)).toEqual([]);
        expect(normalizeCustomFieldDefs("nope")).toEqual([]);
        expect(normalizeCustomFieldDefs({0: field()})).toEqual([]);
    });

    it("passes well-formed entries through unchanged", () => {
        expect(normalizeCustomFieldDefs([field()])).toEqual([field()]);
    });

    it("defaults missing properties", () => {
        expect(normalizeCustomFieldDefs([{id: "cf2"}])).toEqual([
            {id: "cf2", name: "", short: "", type: "string", actorTypes: 0},
        ]);
    });

    it("coerces an unknown type to string", () => {
        expect(normalizeCustomFieldDefs([field({type: "boolean"})])[0].type).toBe("string");
    });

    it("drops entries with a missing, malformed, or duplicate id", () => {
        const defs = normalizeCustomFieldDefs([
            field(),
            field({id: ""}),
            field({id: "Bad Id"}),
            field({id: "cf1", name: "Duplicate"}),
            null,
            "junk",
        ]);
        expect(defs).toEqual([field()]);
    });
});

describe("normalizeCustomAttributeDefs", () => {
    it("returns [] for non-array input", () => {
        expect(normalizeCustomAttributeDefs(undefined)).toEqual([]);
    });

    it("cleans entries and forces active to a boolean", () => {
        expect(normalizeCustomAttributeDefs([{id: "ca1", name: "Magic", active: "yes"}])).toEqual([
            {id: "ca1", name: "Magic", short: "", active: false},
        ]);
        expect(normalizeCustomAttributeDefs([{id: "ca1", name: "Magic", active: true}])[0].active).toBe(true);
    });
});

describe("visibleCustomFields", () => {
    const defs = [
        field({id: "cf1", actorTypes: 0b00001}),               // character only
        field({id: "cf2", name: "Rank", actorTypes: 0b11111}), // everyone
        field({id: "cf3", name: "", actorTypes: 0b11111}),     // unnamed → hidden
    ];

    it("filters by the actor type's mask bit", () => {
        expect(visibleCustomFields(defs, "character", MASKS).map((d) => d.id)).toEqual(["cf1", "cf2"]);
        expect(visibleCustomFields(defs, "starship", MASKS).map((d) => d.id)).toEqual(["cf2"]);
    });

    it("hides unnamed fields", () => {
        expect(visibleCustomFields(defs, "npc", MASKS).map((d) => d.id)).toEqual(["cf2"]);
    });

    it("returns [] for an unknown actor type", () => {
        expect(visibleCustomFields(defs, "container", MASKS)).toEqual([]);
    });
});

describe("freshSlotId", () => {
    it("builds a prefixed, lowercased id from the suffix generator", () => {
        expect(freshSlotId([], "cf", () => "A1b2")).toBe("cf_a1b2");
    });

    it("retries on collision with an existing id", () => {
        const suffixes = ["dup", "dup", "new"];
        expect(freshSlotId([{id: "cf_dup"}], "cf", () => suffixes.shift() as string)).toBe("cf_new");
    });

    it("produces ids that survive normalization", () => {
        const id = freshSlotId([], "ca", () => "X9Y8Z7q");
        expect(normalizeCustomAttributeDefs([{id, name: "n"}])).toHaveLength(1);
    });
});

describe("legacyCustomFieldDefs", () => {
    it("converts named slots and keeps historic ids", () => {
        const stored: Record<string, unknown> = {
            custom_field_1: "Reputation",
            custom_field_1_short: "Rep",
            custom_field_1_type: "number",
            custom_field_1_actor_types: 3,
            custom_field_3: "Rank",
        };
        expect(legacyCustomFieldDefs((k) => stored[k])).toEqual([
            {id: "cf1", name: "Reputation", short: "Rep", type: "number", actorTypes: 3},
            {id: "cf3", name: "Rank", short: "", type: "string", actorTypes: 1},
        ]);
    });

    it("drops unnamed slots entirely", () => {
        expect(legacyCustomFieldDefs(() => undefined)).toEqual([]);
    });
});

describe("legacyCustomAttributeDefs", () => {
    it("converts named or active slots and keeps historic ids", () => {
        const stored: Record<string, unknown> = {
            customize_ca1_name: "Magic",
            customize_ca1_name_short: "Mag",
            customize_ca1_active: true,
            customize_ca2_name: "Sanity",   // named but inactive → kept, inactive
            customize_ca4_active: true,     // active but unnamed → kept
        };
        expect(legacyCustomAttributeDefs((k) => stored[k])).toEqual([
            {id: "ca1", name: "Magic", short: "Mag", active: true},
            {id: "ca2", name: "Sanity", short: "", active: false},
            {id: "ca4", name: "", short: "", active: true},
        ]);
    });

    it("drops slots that were never configured", () => {
        expect(legacyCustomAttributeDefs(() => undefined)).toEqual([]);
    });
});
