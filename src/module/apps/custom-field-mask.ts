/**
 * Rebuild a custom-field actor-visibility bitmask from a submitted form value.
 *
 * The Custom Fields form posts, per field, a hidden input carrying the current
 * mask plus one entry per ticked actor type (unticked checkboxes submit
 * nothing). Every known actor-type bit is recomputed from whether its type
 * appears in the submission, so the result is exactly the set of ticked types.
 *
 * Normalising the submission to an array first handles the edge case where only
 * the hidden input is present (all types unticked) — a bare string, which must
 * not be indexed character-by-character.
 *
 * Pure (masks injected) so it is unit-testable without Foundry globals.
 */
export function rebuildActorMask(submitted: unknown, masks: Record<string, number>): number {
    const arr = (Array.isArray(submitted) ? submitted : [submitted]).map(String);
    let value = Number(arr[0]) || 0;
    for (const type in masks) {
        const bit = 1 << masks[type];
        value = arr.includes(type) ? value | bit : value & ~bit;
    }
    return value;
}
