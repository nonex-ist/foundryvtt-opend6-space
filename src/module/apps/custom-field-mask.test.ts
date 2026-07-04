import {describe, expect, it} from "vitest";
import {rebuildActorMask} from "./custom-field-mask";

// Mirrors OD6S.actorMasks: character:0, npc:1, creature:2, vehicle:3, starship:4
const MASKS = {character: 0, npc: 1, creature: 2, vehicle: 3, starship: 4};

describe("rebuildActorMask", () => {
    it("sets exactly the ticked types' bits", () => {
        // hidden current-mask value, then character + npc ticked
        expect(rebuildActorMask(["0", "character", "npc"], MASKS)).toBe(0b00011);
    });

    it("supports a single actor type", () => {
        expect(rebuildActorMask(["0", "starship"], MASKS)).toBe(1 << 4);
    });

    it("clears the mask when nothing is ticked (bare multi-digit string)", () => {
        // Only the hidden input submits → a plain string, not an array.
        expect(rebuildActorMask("31", MASKS)).toBe(0);
    });

    it("clears the mask when nothing is ticked (single-digit string)", () => {
        // Guards the char-indexing bug: "1"[0] must not be read as a type flag.
        expect(rebuildActorMask("1", MASKS)).toBe(0);
    });

    it("recomputes every bit regardless of the hidden starting value", () => {
        // Hidden says 'all types' but only creature is ticked → only creature.
        expect(rebuildActorMask(["31", "creature"], MASKS)).toBe(1 << 2);
    });

    it("handles all types ticked", () => {
        expect(rebuildActorMask(["0", "character", "npc", "creature", "vehicle", "starship"], MASKS)).toBe(0b11111);
    });
});
