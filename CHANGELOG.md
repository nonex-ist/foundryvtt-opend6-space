# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Historical release notes prior to this changelog live on the original
GitLab wiki at <https://gitlab.com/vtt2/opend6-space/-/wikis/Release-Notes>.

## [Unreleased]

### Changed

- System settings are now grouped into logical clusters (Customization, Points
  & Dice, Rules & Combat, Automation, Appearance, Tools) instead of appearing in
  an arbitrary order. The loose display and chat-colour toggles that used to sit
  scattered in the main settings tab are collected into a new **Appearance**
  menu, so the system's settings category shows tidy menu buttons. Setting keys
  and scopes are unchanged, so existing worlds keep their saved values. The
  Appearance menu stays open to players for their own client-scoped preferences
  (chat colours, sheet opacity) while keeping world display toggles GM-only.
- Settings panels now look and behave consistently: a shared base class backs
  the list-style menus, every panel uses the same compact form styling and a
  single **Close** button, custom-label fields show their built-in default as a
  placeholder, and a footer note reminds you that **changes are saved
  automatically**. Custom Labels wording was also tightened (concise labels +
  hints that explain what each setting changes). Long panels (Custom Labels,
  Rules Options, Automation) are split into labelled sections for readability.
- Custom attributes (CA1–4) are consolidated into a dedicated **Custom
  Attributes** menu — name, abbreviation, and active toggle per attribute in one
  place — instead of being split between Custom Labels and Active Attributes.
  (Display order still lives in Attribute Sorting.)
- The **Custom Fields** menu was overhauled: each field is now a single card
  (name, abbreviation, data type, and which actor types show it) instead of
  sixteen loose rows, so it's clear which controls belong to which field.

### Added

- **Maintenance** settings menu (GM-only) with a **Repair legacy labels** tool
  that re-runs the #189 stored-label repair on demand — handy after importing
  actors from an old-id world once the one-shot migration has already passed.
  It shares the same idempotent routine as the automatic migration and reports
  how many labels it rewrote.

### Fixed

- Labels persisted as i18n keys in actor/item `system` data (character points,
  fate points, character type, species, and vehicle/starship header fields)
  were left pointing at the retired `OD6S.*` root after the 3.0.0 rename, so
  migrated sheets showed the raw reference (e.g. `OD6S.Char_Char_Points_Short`)
  instead of the label. A one-shot migration now rewrites these to the current
  `NONEX_IST_OD6S.*` keys on first load. (#189)

## [3.0.1] - 2026-07-03

### Changed

- `compatibility.verified` bumped from `14.363` to `14.364` to match the
  current recommended Foundry V14 build.

### Added

- World settings stranded under the old `od6s.*` namespace after the 3.0.0
  system-id rename are now migrated onto `nonex-ist-od6s.*` automatically on
  first load, so GMs no longer have to re-enter Wild Die faces, labels,
  deadliness, and other System Settings by hand. Values already set under
  the new id are left untouched, and `systems/od6s/` asset paths are
  rewritten to `systems/nonex-ist-od6s/`.

## [3.0.0] - 2026-07-03

### Changed

- **BREAKING:** System id renamed from `od6s` to `nonex-ist-od6s`. Foundry
  treats this as a different system, so existing worlds need to be re-pointed
  at the new system folder (`Data/systems/nonex-ist-od6s/`). The world's per-
  system settings live under the old id and won't carry over automatically;
  document flags are preserved by a one-shot world migration that rewrites
  every `flags.od6s.*` entry on actors, items, scenes, and chat messages to
  `flags.nonex-ist-od6s.*`.
- CSS class/id prefix renamed from `od6s-` to `nonex-ist-od6s-`. CSS custom
  properties renamed from `--od6s-*` to `--nonex-ist-od6s-*`.
- i18n key root renamed from `OD6S.*` to `NONEX_IST_OD6S.*` across all four
  bundled translations.
- Global JS namespace renamed from `game.od6s` to `game["nonex-ist-od6s"]`
  (the new id contains hyphens, so bracket access is required).

### Fixed

- Image path settings in the config menus (Wild Die faces, active-attribute
  icons, initiative/custom-field images) accumulated a growing bracketed list
  of paths on every submit. The templates rendered a plain `<input>` alongside
  the form-associated `<file-picker>` element under the same `name`, so the
  form serialized two entries per field into an array. The redundant `<input>`
  is removed; the `<file-picker>` already provides the text field and browse
  button. Existing corrupted values are overwritten the next time a valid
  image is selected. (#181)

## [2.7.4] - 2026-06-02

Second hotfix for the 2.7.2 manifest art: the package tile and thumbnail
returned 404 because relative `assets/...` paths in `media.url` and
`media.thumbnail` are resolved by the browser against the current setup
page URL, not against the system root. Foundry returns these strings
verbatim from `BasePackage.getCover`, so the manifest has to spell out
the full `systems/<id>/` prefix — same convention used by dnd5e and pf2e.

### Fixed

- `media[].url`, `media[].thumbnail`, and the icon entry's `url` in
  `system.json` now use absolute `systems/nonex-ist-od6s/assets/...` paths instead
  of relative ones, so Foundry's setup screen actually loads the artwork.

## [2.7.3] - 2026-06-02

Hotfix for the 2.7.2 manifest art: the setup screen never picked up the
cover or thumbnail because Foundry's `BasePackage.getCover` only inspects
`media` entries whose `type` is `"setup"` — `"cover"` is schema-valid but
silently ignored by the setup UI.

### Fixed

- `media[].type` in `system.json` changed from `"cover"` to `"setup"` so
  Foundry's setup screen actually resolves the package tile and its
  thumbnail. No asset changes; the existing WebPs under `assets/` are
  reused as-is.

### Changed

- `compatibility.verified` bumped from `14.361` to `14.363` to match the
  current Foundry V14 build the system is being tested against.

## [2.7.2] - 2026-06-02

Cosmetic release: declare cover, thumbnail, and icon artwork so the
system surfaces its branding on Foundry's setup screen and in package
listings instead of falling back to a generic placeholder.

### Added

- `media` array in `system.json` pointing at new WebP assets shipped
  under `assets/`: a 1920×1080 cover with a 300×300 thumbnail, plus a
  256×256 package icon.

## [2.7.1] - 2026-06-02

Repository moved to the `nonex-ist` GitHub organization. No functional
changes — this release ships the new canonical manifest URL so future
auto-updates resolve directly instead of via GitHub's redirect, and
validates that cosign keyless release signing works under the new
workflow identity.

### Changed

- Manifest, download, and homepage URLs in `system.json` and
  `package.json` rewritten from `Jan-Ka/foundryvtt-opend6-space` to
  `nonex-ist/foundryvtt-opend6-space`. Existing installs continue to
  receive updates via GitHub's repo-transfer redirect; this release
  bakes in the new URL so subsequent updates skip the redirect.
- Cosign verification identity in `CONTRIBUTING.md` updated to the new
  workflow path. Tags prior to v2.7.1 remain signed under the previous
  identity — verifying older releases requires the old regex.

## [2.7.0] - 2026-06-01

User-facing bug-fix batch focused on the character sheet (Active
Effects, Metaphysics) and the legacy settings dialogs, plus an opt-in
mitigation for the Pings module interaction.

### Added

- Manifestation `+` button on the character sheet's Metaphysics tab
  (#163): the Manifestations column previously rendered only its
  heading, and the shipped compendia have no manifestations to drag in,
  so users had no UI path to create one. The new `.item-add` button
  routes through the existing inventory-tab listener into the
  `OD6SAddItem` dialog filtered to the `manifestation` type.
- Active Effects toggle on the actor sheet (#165): the Special
  Abilities / Data tabs now expose an enable/disable control next to
  edit and delete, wired to a `.effect-toggle` listener that flips
  `effect.disabled` and re-renders the sheet so the icon and disabled
  styling refresh immediately. `NONEX_IST_OD6S.TOGGLE_EFFECT` added to
  `en.json`.
- Opt-in `block_sheet_pointer_bleed` client setting (#166): when
  enabled, a `document.body` mousedown listener calls
  `stopPropagation` for events that originate inside `.application` or
  `<dialog>`, so the unmaintained Pings module's window-level
  long-press listener no longer fires from clicks on character sheets.
  Canvas clicks still bubble through. Default off so behavior is
  unchanged for users who aren't affected.

### Fixed

- Active Effect creation rejected with `validation errors: name: may
  not be undefined` (#164). Foundry v11 renamed `ActiveEffect.label`
  to `name`; the `addEffect` helper still passed `{label: name}` so
  the schema's required `name` field was always undefined. Pass
  `name` directly.
- Delete affordance on the Special Abilities tab (#165): the template
  rendered effects with only an edit button, so existing effects
  could not be removed from the sheet.
- Orphan ActiveEffects left behind when their source item was
  deleted (#165): `drops.ts` and legacy worlds create actor-embedded
  effects whose `origin` points at the source item, but no cleanup
  ran on item deletion. A new `preDeleteItem` hook walks
  `actor.effects` and removes any whose `origin` matches the deleted
  item's uuid; the sweep runs exactly once on the initiating user's
  client (who already had owner permission to delete the item),
  avoiding permission errors for other connected users and not
  requiring an active GM session.
- Effect-management listeners moved above the `isEditable` gate in
  `actor-sheet.ts` (#165): toggle/edit/delete are play-mode actions
  (like rolling), so the gate was hiding the wiring but not the
  buttons — the trash icon on the data tab silently no-op'd in PLAY
  mode for owners.
- Pre-existing `data-effect-id="effect.id"` typo on the data-tab
  `<li>` (#165): missing Handlebars braces meant every list item
  shared the literal string `effect.id`, so per-row actions targeted
  the wrong document.
- Five legacy settings dialogs silently failed to save (#161,
  #162): `custom-fields.html`, `wild-die.html`, `active-attributes.html`,
  `attributes-sorting.html`, and `initiative-settings.html` each
  wrapped their body in a nested `<form>` inside the ApplicationV2
  root (which is already a form). Browsers ignored the inner open
  tag but treated the inner `</form>` as closing the outer, leaving
  inputs detached from the form the submit handler read. Same root
  cause as the 2.6.x `settings-v2.html` fix (82888b6); the five
  legacy templates were missed by that pass. Swapped outer `<form>`
  for `<div>` to match the documented V2 pattern.

### Changed

- Dev-dependency refresh: `@commitlint/cli` and
  `@commitlint/config-conventional` 20 → 21, `lint-staged` 16 → 17,
  plus minor/patch bumps for `vitest`, `@playwright/test`, `eslint`,
  `typescript-eslint`, `sass`, `js-yaml`, and `@cyclonedx/cdxgen`.
  Lint warnings 213 → 209 (all remaining are `no-explicit-any`
  typing debt).

### Smoke coverage

- `tests/smoke/tier-3-active-effects.spec.ts` regressions for the
  #164 `name`-vs-`label` fix, the #165 actor-effect toggle and delete
  wiring, and the #165 orphan cleanup on item delete. Tests drive
  through the actual DOM (`.effect-add`, `.effect-toggle`,
  `.effect-delete`) rather than the document API so listener wiring
  is exercised end-to-end.

## [2.6.1] - 2026-05-11

### Fixed

- Armor `system.damaged` is now declared on `ArmorData.defineSchema()`
  (#67 follow-up): the field was referenced by the armor sheet
  template, by the wound helper's `auto_armor_damage` path, and by the
  manual `<select>` on the armor sheet, but never declared on the
  DataModel. V14's strict `TypeDataModel` silently dropped the field
  on every update, so manual *and* automatic armor damage tracking
  were no-ops. Surfaced by the hermetic #67 regression spec after it
  was refactored to flip `weapon_armor_damage` on for the probe.
- `<select>` `selected` comparison in the armor / weapon /
  starship-weapon / vehicle-weapon item-sheet templates coerces the
  iterated key to a number before comparing against the stored
  `system.damaged` value. The keys arrive as strings (`for…in` over
  the levels record) while `damaged` is a `NumberField`, so the strict
  `eq` helper never matched and the browser silently fell back to the
  first `<option>` on every re-render.

### Changed

- Bump `compatibility.verified` to Foundry **14.361** (current
  recommended build).

## [2.6.0] - 2026-05-09

Internal-quality release: socket transport consolidated onto socketlib
with authorization gates and typed payloads (#129, #130), per-document
schema-version stamping with GM-visible lag warnings (#85), chat-card
accessibility (#80), the V14-typing cleanup (#137), and dev-dependency
advisories cleared. No new rules content; one user-visible feature
surface (chat-card a11y) and one new GM-visible notification
(schema-version mismatch).

### Added

- Chat-card accessibility (#80): icon-only buttons in
  `templates/chat/*.html` carry localized `aria-label` with their inner
  `<i>` marked `aria-hidden`; `.modifiers-button` /
  `.damage-modifiers-button` are now keyboard-activatable
  (`role="button"` + `tabindex="0"` + delegated Enter/Space handler in
  `chat-log-listeners.ts`); each chat message gets `role="article"`
  with an `aria-label` combining roll-mode + speaker for
  whispered/private rolls; hover styles on header / oppose /
  choose-target / edit-difficulty / edit-damage / modifier-toggle
  buttons are mirrored under `:focus-visible` with an accent outline
  (WCAG 2.4.7); `.roll.max/.success` get bold + underline and
  `.roll.min/.failure` bold + line-through so the dice success/failure
  cue no longer depends on green-vs-red alone.
- Per-document schema version stamping (#85): every actor and item
  DataModel gains a `system._systemSchemaVersion` field (via a shared
  `schemaVersionField()` factory) stamped on `_preCreate`. A new
  `compareSchemaVersion` helper plus a `prepareData`-time check warn
  the GM once per (doc, state) when a stored doc lags or runs ahead of
  the system version, surfacing pre-migration drift before it causes
  downstream errors. The 2.6.0 migration step bulk-stamps every
  in-world doc on first load so the warn logic has a populated field
  to compare against.

### Security

- Cleared the three open dev-dependency advisories (none of these
  ship to users): `@cyclonedx/cdxgen` 12.3.1 → 12.3.3 (moderate
  Docker registry credential-forwarding, GHSA-qhh4-458h-xwh2);
  transitive `fast-uri` `<3.1.2` pinned to `>=3.1.2` via a
  `pnpm.overrides` entry (host-confusion GHSA-v39h-62p7-jpjc plus
  the path-traversal companion, both high — reaches us through
  `@commitlint/cli > ajv > fast-uri`, override is scoped to
  `<3.1.2` so it lifts automatically once the upstream chain
  catches up). Rolling patch on `typescript-eslint` 8.59.1 → 8.59.2
  alongside.

### Changed

- v14 polish batch (#132): dropped the dead V1
  `foundry.appv1.sheets.ActorSheet` / `ItemSheet` `unregisterSheet`
  calls in `nonex-ist-od6s.ts`; routed `system/migration.ts` and
  `system/schema-version.ts` console output through `logger.ts` so
  output is debug-flag-gated (`localStorage.od6sDebug`) and tagged
  consistently; wrapped the async `chat-hooks` (`preDeleteChatMessage`,
  `updateChatMessage`, `createChatMessage`), `region-hooks`
  (`updateRegion`, `deleteRegion`), and the `chat-log-listeners`
  `delegateEvent` shared helper in error boundaries that emit an
  `[od6s:…]` breadcrumb instead of surfacing as bare unhandled
  rejections; and replaced the per-actor crew-broadcast `actor.update()`
  loops in `crew-vehicle.ts` and `socketlib.ts:sendVehicleData` with a
  single `Actor.updateDocuments` batch (token-actor sync stays
  per-doc since synthetic actors don't live in `game.actors`).

- Replaced the `Record<string, any>` typing on the central `OD6S`
  config object with a typed `Od6sConfig` interface, and split the
  remaining inline tables out of `config-od6s.ts` into typed
  submodules (`difficulty.ts`, `modifiers.ts`, `vehicles.ts`,
  `wounds.ts`). Existing submodules (`attributes`, `damage`,
  `weapons`, `actions`, `status-effects`, `labels`, `deadliness`)
  gained explicit interfaces. The public surface for the ~60
  import sites is unchanged; one pre-existing typo
  (`starshipToughessName` → `starshipToughnessName`) was unified,
  the dead `NONEX_IST_OD6S.metaphysicsSkills` write and the unused/broken
  `getDifficultyFromShort` Handlebars helper were removed (#58).
- Extracted four pure helpers from `roll-execute.ts` into
  `roll-execute-math.ts` — `applyDicePenalties`, `buildRollString`,
  `detectWildDieResult`, `assembleDamageDice` — covered by 16 new
  unit tests. Roll-execution behaviour unchanged; the orchestration
  file shrinks by ~55 LOC and the damage-modifier pipeline (scale,
  fatepoint str-doubling, vehicle-ram, pip bonuses) is now testable
  without Foundry globals (#59 part 1).
- Extracted six pure helpers from
  `actor/actor-helpers/crew-vehicle.ts` into
  `crew-vehicle-math.ts` — `isCrewMemberByFlag`, `canRemoveFromCrew`,
  `removeCrewmember`, `buildVehicleWeaponSnapshots`,
  `shouldDispatchVehicleDataAsGM`, `selectCrewmembersForBroadcast` —
  covered by 24 new domain tests in
  `tests/domain/crew-vehicle.test.ts`. The orchestrator still owns
  the document mutations and socket dispatch; what runs around them
  (crew flag predicates, weapon-snapshot projection, GM-vs-player
  branching) is now exercised without a Foundry runtime (#84).
- Polish batch (#60): extracted blast-radius damage falloff to
  named constants in `explosives.ts`; added an `error()` breadcrumb
  to `system/logger.ts` and wired it into the three swallowed-failure
  sites the issue called out (`roll-effects.ts:cancelAction`,
  `roll-setup.ts` out-of-range cleanup, the `nonex-ist-od6s.ts` socket
  dispatcher); enabled `noUnusedLocals`, `noImplicitReturns`, and
  `noFallthroughCasesInSwitch` in `tsconfig.json` and fixed the ~30
  errors that surfaced (mostly explicit fall-through `return undefined`
  on Handlebars helpers / drop handlers; no behavioural change).
- Tightened parameter typing across `system/utilities/*.ts` and
  `apps/roll-helpers/*.ts`: `weapons.ts` range buckets, `actors.ts`
  user-active access, `effects.ts` GM check, `bind-tabs.ts` (drops
  the local `declare const foundry: any`), `opposed.ts` opposed-roll
  state shapes, `misc.ts` template lookup, `explosives.ts` (typed
  `ExplosiveTarget`, `DetonateExplosiveData`, scatter / detonate
  signatures), plus `vehicle_weapons` on `OD6SCharacterSystem.vehicle`
  narrowed to `Item[]`. Foundry shim gains `User.active`,
  `Combat.scene`, `Scene.regions`, `ChatMessage.clone`, and the
  `foundry.applications.ux.Tabs` namespace, with the v14
  `StatusEffect` shape replacing the v13 `{label, icon}` form
  (no behavioural change; lint count drops 613 → 579) (#59 part 2).
- Socket transport consolidated onto socketlib (#130): the three live
  native-socket ops (`updateRollMessage`, `updateInitRoll`,
  `removeFromVehicle`) migrated to `NONEX_IST_OD6S.socket.executeAsGM`, with
  four dead ops removed (`addToVehicle`-native, `sendVehicleStats`,
  and the dead native branches of the two explosive-region ops).
  `src/module/system/socket.ts` and the
  `game.socket.on('system.nonex-ist-od6s', …)` dispatcher in `nonex-ist-od6s.ts` are
  gone. Every socketlib handler is now wrapped in a small `register()`
  helper that catches handler exceptions and routes them through
  `logError('socket', …)` — same `[od6s:socket]` breadcrumb the
  native dispatcher had, now applied uniformly.
- Authorization + payload typing across all mutating socketlib
  handlers (#129): `sendVehicleData`, `modifyShields`, `updateVehicle`,
  `unlinkCrew`, `addToVehicle`, `updateExplosiveRegion`,
  `deleteExplosiveRegion`, `setVehicleFlag`, `unsetVehicleFlag` now
  take `userId` as their first argument and validate with
  `testUserPermission` before mutating. Vehicle ops route through a
  new `userMayMutateVehicle()` helper (GM, vehicle OWNER, or owner of
  any current crewmember — the crew fallback covers the dodge handoff
  in `combat-hooks.ts`); region ops require the caller to own the
  supplied detonator `actorUuid`. `data: any` parameters replaced
  with a discriminated `SocketPayload` union (`VehicleDataPayload`,
  `ModifyShieldsPayload`, `ExplosiveRegionPayload`,
  `DeleteExplosiveRegionPayload`). Trust model documented at the top
  of `socketlib.ts`. The follow-up tightening (#142) finished
  removing the last `any[]` from the `register()` wrapper signature
  and dropped the socket handler's residual dependency on the vehicle
  sheet by retyping `linkCrew` / `unlinkCrew` sheet-helpers to take
  the vehicle document directly.
- Foundry typing cleanup (#137 / PRs #138, #140): widened the
  ambient `foundry.applications.api` / `.sheets` / `.ux` namespace
  shadow to cover the V14 sheet + dialog API surface, and retired
  the per-file shadow declarations that had accumulated during the
  V1→V2 migration. `OD6SItemSystem` narrowed; structural change
  only, no behavioural diff.

## [2.5.0] - 2026-05-06

Two user-facing bug fixes (#40, #86) plus the close-out of three
long-running internal-decomposition issues (#98 `setupRollData` →
typed per-roll-type handlers; #83 `actor-sheet.ts` 788 → 401 LOC;
#57 / #56 discriminated-union narrowing across the codebase).

### Added

- 25 pure typed handlers for `setupRollData` under
  `src/module/apps/roll-helpers/` — one per `(type, subtype)` roll
  path — plus a `runFinalize` step that owns the COMMON-fields
  partition. The handler dispatch is exhaustiveness-checked at
  compile-time via the `RollTypeKey` discriminated union (#98).
- Smoke specs covering action rolls (brawlattack, vehicleramattack,
  vehicletoughness) and the melee-range preflight gate, exercising
  paths the unit/domain layers can't reach (#98).
- 1010 lines of new domain tests in `tests/domain/` covering the
  weapon, action, damage/resistance, skill, and resource (funds /
  purchase) handler buckets (#98).

### Changed

- `setupRollData` rewritten as a thin coordinator (preflight →
  classifyRoll → adaptContext → `HANDLERS[key]` → runFinalize),
  replacing the legacy 650-line single function with 30+ mutable
  locals. RFCs surfaced during the cutover and applied: `+5` magic
  constant on action-meleeattack removed (no rules backing, #100);
  `vehicleramattack` adds `ram.score` once instead of twice (#103);
  `attackerScale` derives unconditionally from the actor for attack
  rolls with no targets (#104). The decomposition also unblocked
  Audit-A — `fatepointeffect` doubling now routes through
  `FinalizeInput.diceMultiplier` so damaged / `roll_mod` re-derives
  can't overwrite it (#98 / closes #82).
- `actor-sheet.ts` decomposed in four phases (#107-#109, #111):
  788 → 401 LOC. Item categorization and sci-fi defaults extracted
  to `actor-helpers/`; roll and inventory-transfer wiring extracted
  to `sheet-helpers/`; drag handlers and crew helpers split into
  `sheet-listeners/`. `_prepareContext` typed end-to-end and most
  trivial `any` annotations dropped (closes #83).
- `roll-setup.ts` pre-decomposition: distance→range bucketing,
  weapon mods/stun/modifier math, and action / penalty / ram /
  bonusdice math all extracted into pure unit-tested helpers
  (`difficulty-math.ts`, `weapon-context-math.ts`, `action-math.ts`,
  PRs #95-#97). 717 → 678 LOC; ~50 unit tests added (closes #82).
- Discriminated `Actor` / `Item` unions in `types/od6s.d.ts` plus
  type-guard helpers in `system/type-guards.ts`
  (`isCharacterActor`, `isVehicleActor`, `isWeaponItem`, … and the
  two combined guards added this release). Per-file narrowing
  swept across `OD6SActor`, `OD6SItem` instance methods,
  `roll-execute`, `roll-difficulty`, chat-log listeners, skills,
  weapons, explosives, advance, item-crud, drops, crew-vehicle,
  socketlib, item-sheet, chat-menu, opposed (#88-#94).
- `OD6SVehicleSystem` now declares `skill` / `specialization` /
  `attribute` / `move` / `shields` / `sensors`, matching
  `vehicle-common.ts`. `OD6SVehicleWeaponItemSystem` and
  `OD6SStarshipWeaponItemSystem` now declare the runtime-derived
  `stats` snapshot and `subtype` populated by
  `prepareDerivedData`. `OD6SCharacterSystem.vehicle` widened to
  mirror the `sendVehicleData` socket payload (#57 / PR #110).
- Actor-sheet listener modules now take the sheet root as
  `HTMLElement` rather than a single-element `HTMLElement[]`. Drops
  the `[root]` shim from `_onRender` and the `const el = html[0]`
  prologue from each listener (#83).
- `Collection<T>` now declares its iterator as `IterableIterator<T>`
  (matching Foundry runtime behaviour) instead of inheriting Map's
  `[key, value]` iteration. `Document.updateDocuments` /
  `deleteDocuments` are also typed. Removes 15 stale `as any` casts
  in migration, explosives, and chat-log code (#56).
- `OD6SCharacterSystem` now declares `credits` and `funds`, matching
  the actual `data/actor/fields/common.ts` schema. Drops the
  `(game as any)` and `(canvas as any)` casts that were papering over
  the gap (14 game / 2 canvas sites) and the `(buyer.system as any)`
  casts in inventory transfer (#56).
- `GameSystem.template` is now typed (Foundry's `template.json`
  descriptor used by item-sheet creation/edit dialogs), and several
  Handlebars accumulators are typed as `Record<string, T>` instead
  of being indexed via `as any`. `OD6SItem.createDialog` now takes a
  typed `data` parameter (#56).
- `roll-setup.ts` and `item.ts` now narrow `actor` and `item` via
  the existing type-guard helpers (plus two new combined guards
  `isAnyWeaponItem` / `isVehicleBorneWeaponItem`) instead of
  ad-hoc `as OD6SCharacterSystem` / `as OD6SWeaponItemSystem`
  casts. ~25 narrowing casts removed; the remaining surface in
  `OD6SItem.roll()` is documented (#57).

### Fixed

- Throwing a second instance of the same explosive item before the
  first resolves no longer clobbers the first throw's flags. The
  per-throw state (`explosiveTemplate` / `explosiveOrigin` /
  `explosiveRange` / `explosiveSet`) was scalar on the item document,
  so throw 2 overwrote the region pointer set by throw 1 and throw 1
  could no longer be resolved. Replaced with a per-region keyed map
  at `flags.nonex-ist-od6s.explosivePending.<regionId>`; the region id is
  threaded through `OD6SItem.roll(parry, regionId)` and stamped on
  each attack chat message as `flags.nonex-ist-od6s.template`, so cleanup
  paths address only their own throw's entry. Migration drops the
  legacy scalars on world upgrade (#40).
- Auto-explosive zone-damage code now reads target dodge from
  `actor.system.dodge.score` (via a type-guarded helper) instead of
  flat `(actor as any).dodge`, which was always `undefined` — so
  `undefined > total` always returned `false` and the
  dodge-vs-explosive evade branch never fired. High-dodge targets
  now actually evade as intended (#86).
- Advanced-skill check on action-routed rolls now consults the
  resolved skill instead of the action item itself. Legacy code
  cast `this.system as OD6SSkillItemSystem` and read
  `isAdvancedSkill` off the action item, where it was always
  undefined → falsy, so advanced skills incorrectly had their
  linked attribute folded into the score. Surfaced during the #57
  narrowing of `item.ts` (#57).
- `roll-action.ts` vehicle-action dispatch tested
  `actor.type === 'starship'` twice instead of `'vehicle'` and
  `'starship'`, so any vehicle-action path on a vehicle actor (not
  starship) crashed in `undefined.specialization`. Caught by the new
  tier-3-action-rolls smoke spec (#98).
- Stun-flag schema typo on the explosive-without-zones path was
  writing to `flags.nonex-ist-od6s.stuns` (existing schema field) instead of
  the intended `stun` boolean. Surfaced while extracting weapon
  mods/stun math; fixed inline (#82).
- Effect-mod accumulator on weapon stats now uses an explicit
  defined-check rather than truthiness, so a `0` effect doesn't
  silently fall back to the base score (#82).
- Apply-damage chat-log handler restructured to remove the
  duplicate `actor.update` call and the asymmetric `-1D` / `-2D`
  payload it produced; defensive early-returns added to
  `applyDamage` / `applyWounds` for missing actors (#57 via PR #93).

### Removed

- Dead `od6sroll._metaphysicsRollDialog` method and the
  `MetaphysicsRollData` type. Zero call sites in code or templates;
  the `(actor as any).actions.length` access inside it would have
  thrown `TypeError` if reached (#86).
- Dead `brawlattack` top-level RollTypeKey path. No caller produces
  `type === 'brawlattack'`; `Actor.rollAction` wraps brawl as
  `{type: 'action', subtype: 'brawlattack'}` which routes to the
  `action-brawlattack` handler (#98).

## [2.4.0] - 2026-05-02

Chat-card accessibility pass closing #77, plus the per-roll mode
selector and a v13 ApplicationV2 delete-button regression fix that
surfaced while testing it.

### Added

- Chat cards now distinguish public / self-roll / GM-whisper / blind
  rolls with distinct, WCAG-AA-checked accent colors and a localized
  text badge in the header (Private / GM / Hidden) that screen readers
  pick up alongside the visual treatment (#77). The blind-roll default
  is a neutral slate grey to stay legible over busy maps, per the
  accessibility request in the issue.
- Four client-scoped color pickers and a chat background-opacity
  slider, registered together in the settings UI. Independent from
  the existing sheet-opacity slider — chat density makes the trade-offs
  different, so it gets its own knob.
- Per-roll **Mode** selector in the roll dialog footer (mirrors the
  existing sheet-mode footer pattern). Defaults to `gmroll` for GMs
  who have **Hide GM rolls** on, public otherwise; the explicit dialog
  choice always wins over the auto-private setting.
- `getWeaponRange` regression coverage for the calculated-range
  branches (#75).

### Fixed

- Trash icon on chat cards now actually deletes the message. Foundry
  v13's ApplicationV2 action map (`ChatLog`) requires
  `data-action="deleteMessage"` on the button — the V2-migrated
  templates were missing it, so clicks were no-ops.
- Players can roll from their character sheet again (#76) — fixed
  before the chat work, included here.

### Removed

## [2.3.0] - 2026-05-02

Closes the entire 2026-05-02 user-reported bug batch (#54, #55, #61,
#62, #63, #64, #65) plus the two follow-up sweeps (#67, #71) that
clear the broader root-cause classes.

### Added

- `+` controls for **Advantages**, **Disadvantages**, and **Special
  Abilities** lists on the actor sheet's Special tab (#62). Previously
  those lists could only be populated via drag-and-drop.

### Changed

- Sheet-mode (Normal / Free Edit) toggle lifted out of per-template
  inline placement into a single shared footer partial pinned to the
  bottom of every actor sheet (#63). Visually consistent across
  character / NPC / creature / vehicle / starship.
- Cargo-hold display on starship and vehicle sheets now lists every
  cargo-eligible item type the dialog allows you to add (vehicle-*
  on starships, starship-* on vehicles), not just `armor / weapon /
  gear`. The dialog and the displayed list are now in sync (#64).
- Remaining V1 `Dialog` / `renderTemplate` / `FormDataExtended`
  call sites in actor and item paths ported to their `DialogV2` /
  `foundry.applications.handlebars.renderTemplate` equivalents (item
  delete confirm, body-points roll confirm, sidebar Item create
  dialog, vehicle-transfer prompt). No more deprecation warnings
  from those flows in the v14 console.

### Fixed

- Drag-and-drop from compendium or sidebar Items onto an actor sheet
  now actually creates the item (#61). The handler called the V1-only
  `_onDropItemCreate`, which doesn't exist on `ActorSheetV2`; inlined
  the V2 `createEmbeddedDocuments` equivalent. Includes a fix for a
  pre-existing `ReferenceError` on cross-actor drop-moves that the
  prior `@ts-expect-error` was hiding.
- Drop a folder of Items onto an actor sheet to batch-add them; drop
  an ActiveEffect onto an actor sheet to copy it (#71). Both paths
  now re-enter the per-item drop pipeline, so all type dispatch,
  guards, and normalization apply identically to single-item drops.
- Description fields and other `<prose-mirror>` editors are now
  clickable (#54). Foundry's prose-mirror uses an absolutely-
  positioned toolbar, so without an explicit flex chain the
  contenteditable area collapsed to ~30px while floating toolbar
  buttons overlaid the rest of the box and intercepted clicks.
- Cargo-hold `+` button on starship/vehicle sheets now opens a
  V2-styled dialog and saves the item (#64). The earlier dialog used
  the deprecated V1 globals — unstyled grey/white text, broken save.
- Free-Edit mode toggle is now visible on NPC, Creature, Vehicle, and
  Starship sheets (#63). The control existed but was tucked into the
  header grid where users couldn't find it.
- Weapon Type, starship damage, vehicle damage, item attribute, gear
  price, armor damaged, manifestation difficulty, cybernetic
  location, and several other `<select>` fields no longer revert to
  their first option when other fields are edited (#55, #65, #67).
  Root cause: Handlebars context-shift bug inside `{{#each}}` blocks
  meant no option ever got the `selected` attribute, so the next
  submitOnChange clobbered storage with whatever the browser was
  showing. Swept across 14 templates total.
- Sheet header name input ("character name" big gold text) no longer
  has the top of letters clipped by `.sheet-header { overflow:
  hidden }` (#64 sub-fix). Browser default `h2 { font-size: 1.5em }`
  was cascading through the input's `font-size: 2.1em` to ~50px,
  exceeding the 44px box.

### Maintenance

- Dev dependencies updated (#53).

## [2.2.0] - 2026-05-02

Minor release covering nine PRs since 2.1.3.

### Added

- Sheet background opacity slider for actor and item sheets (#31).

### Changed

- Roll, advance, and specialize dialog markup polish — fixed `column>`
  typo, cpcost color, dice-suffix glyph, dialog-section headers, gold
  Roll button.

### Fixed

- Sheet persistence regressions — final residuals closed (#34, #42).
- Vehicle item subtype declared in the system manifest (#33, #35).
- Vehicle and starship sheets pick up the skill display migration
  done for character/NPC sheets (#29).
- Wounds dropdown now reflects the stored value on render (instead
  of always showing the first option).
- Character portrait click reliably opens the FilePicker on V2
  sheets (#30); the legacy `data-edit="img"` alone wasn't enough.

### Tests

- Weapon roll damage flag covered by smoke spec (#36).
- Weapon range and skill form persistence covered by smoke (#38).
- Smoke suite expanded to 32 specs, full pass.

## [2.1.3] - 2026-05-01

### Changed

- Decoupled skill display score from `system.score` so vehicle and
  starship sheets don't mutate the score at render time (#13, #29).

## [2.1.2] - 2026-05-01

### Fixed

- Weapon specialization rolls respect `rollMin` and attribute-relative
  range bands (#16, #17).

## [2.1.1] - 2026-05-01

### Fixed

- Auto-explosive end-to-end flow plus general v14 hardening for the
  explosive pipeline (#19).
- Sheet edits not persisting in Free Edit mode (#27).
- Vehicle defense and `embedded_pilot` truthy-check edge cases (#15,
  #18).
- Latent bugs surfaced during the type cleanup PR (#20) review (#21).

### Maintenance

- ~370 `no-explicit-any` warnings cleared across the codebase (#20).
- Smoke harness automates world setup with per-spec identity guard
  (#32).
- PR preview build workflow added; `upload-artifact` pinned to
  v7.0.1.

## [2.1.0] - 2026-04-29

First post-2.0.0 minor — focused on a sci-fi UI redesign and
pervasive type-safety cleanups across the codebase.

### Added

- Sci-fi themed redesign of the actor sheet and chat cards (#12).

### Changed

- `Actor.system` tightened to a discriminated union; obsolete
  `@ts-expect-error` suppressions cleared.
- Pure roll math extracted from `roll-execute.ts` for unit testing.
- `weapons.ts` and `labels.ts` extracted from `config-od6s.ts`.
- `actor.ts` and `crew-vehicle.ts` public signatures tightened.
- Item.roll lifts Actor narrowing to one place.
- `system/utilities` barrel passthroughs given proper types.
- `wounds.ts` helpers typed; vehicle damage shape added.
- Redundant `as-any` casts dropped in favor of `nonex-ist-od6s.d.ts`.

### Maintenance

- Node 24 + pnpm 10.33.2; Sass to ^1.99.0; lockfile maintenance.
- CI upgraded to Node 24; GitHub Actions pinned by hash.
- Renovate global automerge disabled.
- Domain test fixture data inlined from docs/reference.

## [2.0.0] - 2026-04-27

Near-complete rewrite of the original OpenD6 Space system by Jim Raney,
targeting Foundry VTT v14. Game rules and compendium content are unchanged;
everything under the hood is new.

### Added

- **Foundry v14 support:** all v14 breaking changes addressed; minimum and
  maximum compatibility locked to v14
- **TypeDataModel:** actor and item data models converted from `template.json`
  to TypeDataModel classes, giving proper schema validation and typed access
- **ApplicationV2 sheets:** `OD6SActorSheet` and `OD6SItemSheet` rewritten
  with `HandlebarsApplicationMixin(ActorSheetV2 / ItemSheetV2)`; all ~30
  sub-forms and dialogs migrated from `FormApplication`/`Dialog` to
  ApplicationV2 or `DialogV2`
- **Scene Regions for explosives:** `ExplosivesTemplate` replaced the removed
  `MeasuredTemplate` API with a PIXI-based preview and a circular
  `RegionDocument` for blast radius, scatter, and zone damage
- **TypeScript:** full codebase converted to TypeScript; bundled via esbuild
- **Playwright smoke tests:** automated browser tests against a live Foundry
  instance covering boot, sheet rendering, settings, rolls, wounds, and combat
- **Vitest unit and domain suites:** pure-function and domain-rule coverage
  extracted from the TS modules
- **Taskfile:** `task setup`, `task foundry:start/stop/logs`, `task build:*`,
  `task release:patch/minor/major` for local development and releases
- **CI pipeline:** GitHub Actions with cosign keyless signing, CycloneDX SBOM,
  SHA-256 checksum, and dependency review on every PR
- **SVG status icons:** wound and wild-die icons sourced from
  `@iconify-json/game-icons` and built as SVGs, replacing the original PNGs
- **World migration:** automatic data migration from v12-era actor/item
  structures on first load

### Changed

- Build system replaced: gulp + npm to esbuild + pnpm
- SCSS migrated from `@import` to `@use`; output wrapped in `@layer system`
  for Foundry v14 Cascade Layers compatibility
- All jQuery removed from event handlers; replaced with vanilla DOM
  (`addEventListener`, `querySelector`)
- All Handlebars helpers updated to v2-compatible equivalents
  (`selectOptions`, `file-picker`, `prose-mirror`); v1 helpers
  (`checked`, `filePicker`, `editor`) unregistered
- `Roll.evaluate()` (async) replaced with `Roll.evaluateSync()` throughout
- Foundry global namespace references updated to v14 (`foundry.utils.*`,
  `foundry.applications.api.*`, etc.)
- Project moved from GitLab (`gitlab.com/vtt2/opend6-space`) to GitHub
  (`github.com/nonex-ist/foundryvtt-opend6-space`)

### Removed

- `template.json` (superseded by TypeDataModel)
- All jQuery dependencies
- `MeasuredTemplate`-based explosive placement (replaced by Scene Regions)
- gulp and all associated build scripts
