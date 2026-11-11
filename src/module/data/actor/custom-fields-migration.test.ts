import { describe, expect, it } from "vitest";
import { migrateCustomFieldSlots } from "./custom-fields-migration";

describe("migrateCustomFieldSlots", () => {
  it("moves populated slot values into customfields keyed by historic id", () => {
    const source: Record<string, unknown> = {
      custom1: { value: "Rebel Alliance" },
      custom3: { value: "42" },
    };
    migrateCustomFieldSlots(source);
    expect(source.customfields).toEqual({ cf1: "Rebel Alliance", cf3: "42" });
    expect(source).not.toHaveProperty("custom1");
    expect(source).not.toHaveProperty("custom3");
  });

  it("drops empty slots without creating customfields entries", () => {
    const source: Record<string, unknown> = {
      custom1: { value: "" },
      custom2: { value: "" },
    };
    migrateCustomFieldSlots(source);
    expect(source).not.toHaveProperty("custom1");
    expect(source).not.toHaveProperty("custom2");
    expect(source.customfields ?? {}).toEqual({});
  });

  it("re-wraps the legacy bare-string custom1 shape (#190)", () => {
    const source: Record<string, unknown> = { custom1: "Stored Value" };
    migrateCustomFieldSlots(source);
    expect(source.customfields).toEqual({ cf1: "Stored Value" });
  });

  it("normalizes the '[object Object]' cast artifact to nothing (#190)", () => {
    const source: Record<string, unknown> = { custom1: "[object Object]" };
    migrateCustomFieldSlots(source);
    expect(source).not.toHaveProperty("custom1");
    expect(source.customfields ?? {}).toEqual({});
  });

  it("never clobbers an already-populated customfields slot", () => {
    const source: Record<string, unknown> = {
      custom2: { value: "stale" },
      customfields: { cf2: "fresh" },
    };
    migrateCustomFieldSlots(source);
    expect(source.customfields).toEqual({ cf2: "fresh" });
  });

  it("is a no-op on already-migrated sources", () => {
    const source: Record<string, unknown> = { customfields: { cf1: "kept" } };
    migrateCustomFieldSlots(source);
    expect(source).toEqual({ customfields: { cf1: "kept" } });
  });
});
