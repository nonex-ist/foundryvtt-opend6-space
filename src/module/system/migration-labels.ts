/**
 * Pure helpers for the #189 stored-label migration.
 *
 * The 3.0.0 system-id rename moved the i18n root `OD6S.* → NONEX_IST_OD6S.*`,
 * but several labels are *persisted* as i18n key strings inside actor `system`
 * data (e.g. `system.characterpoints.short_label`) and rendered with
 * `{{localize …}}`. Migrated documents keep the retired `OD6S.*` key, so sheets
 * show the raw reference (e.g. `OD6S.Char_Char_Points_Short`) instead of the
 * label. These helpers find and rewrite those stored keys; the Foundry-facing
 * driver that iterates documents lives in `migration.ts`.
 *
 * Kept pure (no Foundry globals) so the transform is unit-testable — see
 * `migration-labels.test.ts`, mirroring the `weapon-migration.ts` pattern.
 */

/** Legacy i18n root retired by the 3.0.0 rename. */
export const LEGACY_LABEL_PREFIX = "OD6S.";
/** Current i18n root. */
export const CURRENT_LABEL_PREFIX = "NONEX_IST_OD6S.";

/** A stored value still pointing at the retired `OD6S.*` i18n root. */
export function isLegacyLabelKey(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(LEGACY_LABEL_PREFIX);
}

/**
 * Map a legacy label key to its current form. Between releases the root was
 * dropped and the suffix upper-cased, so both the original mixed-case
 * `OD6S.Char_Char_Points_Short` and the 2.x `OD6S.CHAR_CHAR_POINTS_SHORT`
 * normalize to `NONEX_IST_OD6S.CHAR_CHAR_POINTS_SHORT`.
 */
export function rewriteLegacyLabelKey(value: string): string {
  return CURRENT_LABEL_PREFIX + value.slice(LEGACY_LABEL_PREFIX.length).toUpperCase();
}

/**
 * Walk a document's `system` source and collect `dot-path → new-key` updates
 * for every string still pointing at the legacy `OD6S.*` root that maps to a
 * key the current translation set actually has (`hasKey`). Guarding on `hasKey`
 * means we never mint a *new* broken reference for a key that was removed
 * outright rather than renamed.
 *
 * Paths are prefixed with `system.` so the result can be handed straight to a
 * Foundry document update. Arrays are treated as leaves (not descended into):
 * these labels live in nested schema fields, and emitting numeric-index paths
 * would risk Foundry's `expandObject` corrupting the array on write.
 *
 * `hasKey` is injected to keep this pure and testable without `game.i18n`.
 */
export function collectLegacyLabelUpdates(
  system: unknown,
  hasKey: (key: string) => boolean,
): Record<string, string> {
  const updates: Record<string, string> = {};
  walk(system, "system", updates, hasKey);
  return updates;
}

function walk(
  node: unknown,
  path: string,
  out: Record<string, string>,
  hasKey: (key: string) => boolean,
): void {
  if (isLegacyLabelKey(node)) {
    const newKey = rewriteLegacyLabelKey(node);
    if (hasKey(newKey)) out[path] = newKey;
    return;
  }
  // Skip arrays and non-objects — the labels we rewrite live in schema fields.
  if (Array.isArray(node) || !node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    walk(value, `${path}.${key}`, out, hasKey);
  }
}
