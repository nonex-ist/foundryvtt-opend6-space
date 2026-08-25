import { describe, expect, it } from "vitest";
import { migrateCharacterSource } from "./character-migration";

describe("migrateCharacterSource", () => {
  describe("custom1 shape repair (#190)", () => {
    it("wraps a stored plain-string custom1 into the common { value } shape", () => {
      const source: Record<string, unknown> = { custom1: "Reputation 3" };
      migrateCharacterSource(source);
      expect(source.custom1).toEqual({ value: "Reputation 3" });
    });

    it("normalizes the '[object Object]' cast artifact to an empty value", () => {
      const source: Record<string, unknown> = { custom1: "[object Object]" };
      migrateCharacterSource(source);
      expect(source.custom1).toEqual({ value: "" });
    });

    it("wraps an empty string", () => {
      const source: Record<string, unknown> = { custom1: "" };
      migrateCharacterSource(source);
      expect(source.custom1).toEqual({ value: "" });
    });

    it("leaves an already-correct { value } shape untouched", () => {
      const custom1 = { value: "Sanity 5" };
      const source: Record<string, unknown> = { custom1 };
      migrateCharacterSource(source);
      expect(source.custom1).toBe(custom1);
    });

    it("is a no-op when custom1 is absent", () => {
      const source: Record<string, unknown> = { custom2: { value: "x" } };
      migrateCharacterSource(source);
      expect(source.custom1).toBeUndefined();
      expect(source.custom2).toEqual({ value: "x" });
    });
  });
});
