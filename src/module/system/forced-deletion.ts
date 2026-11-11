/**
 * Marker for removing a field in Document update data.
 *
 * Replaces the legacy `"-=key": null` syntax, which Foundry v14 deprecates
 * (warns since 14, removed in 16). Dotted keys are fine:
 * `{ "flags.nonex-ist-od6s.foo": forcedDeletion() }`.
 */
export function forcedDeletion(): foundry.data.operators.ForcedDeletion {
    return new foundry.data.operators.ForcedDeletion();
}
