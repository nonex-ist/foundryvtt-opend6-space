/**
 * Pure migration body shared by the `migrateData` overrides of character, NPC,
 * and creature data models. Lives in its own file so unit tests can import it
 * without pulling files that touch the `foundry` global at module load.
 *
 * #199 replaced the four fixed header-field slots (`system.custom1`–`custom4`)
 * with a dynamic `system.customfields` map keyed by slot id. Legacy slot N maps
 * to id `cfN`, matching the ids the world-settings migration assigns when it
 * converts the `custom_field_N` definitions.
 *
 * Also folds in the #190 repair: `custom1` was once misdeclared on the
 * character schema as a bare `StringField`, so sheets pushed `{ value }`
 * objects through a string cast and persisted the literal `"[object Object]"`.
 * That artifact carries no recoverable data and is dropped.
 */
export function migrateCustomFieldSlots(
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const i of [1, 2, 3, 4]) {
    const key = `custom${i}`;
    if (!(key in source)) continue;
    const legacy = source[key];

    let value: unknown = "";
    if (typeof legacy === "string") {
      value = legacy === "[object Object]" ? "" : legacy;
    } else if (legacy !== null && typeof legacy === "object") {
      value = (legacy as Record<string, unknown>).value ?? "";
    }

    if (value !== "" && value !== null && typeof value !== "undefined") {
      const fields = (source.customfields ??= {}) as Record<string, unknown>;
      const id = `cf${i}`;
      // A populated target means the new slot has been written since the
      // migration — never clobber it with stale legacy data.
      if (!(id in fields)) fields[id] = value;
    }
    delete source[key];
  }
  return source;
}
