import { describe, expect, it } from "vitest";
import {
  collectLegacyLabelUpdates,
  isLegacyLabelKey,
  rewriteLegacyLabelKey,
} from "./migration-labels";

describe("isLegacyLabelKey", () => {
  it("flags strings under the retired OD6S. root", () => {
    expect(isLegacyLabelKey("OD6S.Char_Char_Points_Short")).toBe(true);
    expect(isLegacyLabelKey("OD6S.CHAR_CHAR_POINTS_SHORT")).toBe(true);
  });

  it("ignores already-migrated keys and non-strings", () => {
    expect(isLegacyLabelKey("NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT")).toBe(false);
    expect(isLegacyLabelKey("CP")).toBe(false);
    expect(isLegacyLabelKey(42)).toBe(false);
    expect(isLegacyLabelKey(null)).toBe(false);
    expect(isLegacyLabelKey(undefined)).toBe(false);
  });
});

describe("rewriteLegacyLabelKey", () => {
  it("swaps the root and upper-cases the mixed-case legacy suffix", () => {
    expect(rewriteLegacyLabelKey("OD6S.Char_Char_Points_Short")).toBe(
      "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT",
    );
  });

  it("is idempotent for the 2.x upper-case legacy form", () => {
    expect(rewriteLegacyLabelKey("OD6S.CHAR_CHAR_POINTS_SHORT")).toBe(
      "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT",
    );
  });
});

describe("collectLegacyLabelUpdates", () => {
  // Every rewritten key is "known" unless a test overrides this.
  const hasAll = () => true;

  it("collects nested legacy label keys as system-prefixed dot paths", () => {
    const system = {
      characterpoints: {
        value: 5,
        label: "OD6S.Char_Char_Points",
        short_label: "OD6S.Char_Char_Points_Short",
      },
      chartype: { label: "OD6S.Char_Char_Type" },
    };

    expect(collectLegacyLabelUpdates(system, hasAll)).toEqual({
      "system.characterpoints.label": "NONEX_IST_OD6S.CHAR_CHAR_POINTS",
      "system.characterpoints.short_label": "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT",
      "system.chartype.label": "NONEX_IST_OD6S.CHAR_CHAR_TYPE",
    });
  });

  it("leaves already-migrated and free-text values untouched", () => {
    const system = {
      characterpoints: { short_label: "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT" },
      description: { value: "OD6S is a great system" },
      name: "Silver Kase",
    };

    expect(collectLegacyLabelUpdates(system, hasAll)).toEqual({});
  });

  it("skips keys that no longer resolve so we never mint a new broken reference", () => {
    const system = {
      alive: { label: "OD6S.Char_Char_Points_Short" },
      dropped: { label: "OD6S.Removed_Setting" },
    };
    const hasKey = (key: string) => key === "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT";

    expect(collectLegacyLabelUpdates(system, hasKey)).toEqual({
      "system.alive.label": "NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT",
    });
  });

  it("does not descend into arrays (avoids numeric-index update paths)", () => {
    const system = {
      // A stray legacy key inside an array must not produce `system.tags.0`.
      tags: ["OD6S.Char_Char_Points_Short"],
      characterpoints: { label: "OD6S.Char_Char_Points" },
    };

    expect(collectLegacyLabelUpdates(system, hasAll)).toEqual({
      "system.characterpoints.label": "NONEX_IST_OD6S.CHAR_CHAR_POINTS",
    });
  });
});
