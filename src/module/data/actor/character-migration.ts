/**
 * Pure migration body for `CharacterData.migrateData`. Lives in its own file so
 * unit tests can import it without pulling the rest of `character.ts` (which
 * touches the `foundry` global at module load).
 *
 * - `custom1` was accidentally redefined on the character schema as a bare
 *   `StringField`, overriding the common `SchemaField({ value })` shape used by
 *   `custom2`–`custom4` and every other actor type (#190). Sheets always bound
 *   `system.custom1.value`, so form submissions pushed `{ value }` objects
 *   through the `StringField` cast, persisting the literal string
 *   `"[object Object]"`. Stored strings are re-wrapped as `{ value }`; the
 *   `"[object Object]"` cast artifact carries no recoverable data and is
 *   normalized to an empty value.
 */
export function migrateCharacterSource(
  source: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof source.custom1 === "string") {
    source.custom1 = {
      value: source.custom1 === "[object Object]" ? "" : source.custom1,
    };
  }
  return source;
}
