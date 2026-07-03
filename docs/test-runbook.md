<!-- markdownlint-disable MD013 -->
# OpenD6 Space — Test Runbook

A tier-based test plan for verifying system health after migrations, refactors,
or Foundry version bumps.

## Automated vs manual

| Tier | What                               | How                                |
| ---- | ---------------------------------- | ---------------------------------- |
| 0    | Lint, typecheck, unit tests, build | `pnpm run check && pnpm run build` |
| 1    | Boot & registration                | `pnpm run test:smoke`              |
| 2    | Sheet rendering                    | `pnpm run test:smoke`              |
| 3a   | Settings forms                     | `pnpm run test:smoke`              |
| 3b   | Roll flow (attribute + skill)      | `pnpm run test:smoke`              |
| 3c   | Wound flow & status effects        | `pnpm run test:smoke`              |
| 3d   | Combat & initiative                | `pnpm run test:smoke`              |
| 3e   | Damage pipeline (wounds + vehicle) | `pnpm run test:smoke`              |
| 3f   | Vehicle actor & item schema        | `pnpm run test:smoke`              |
| 3g   | Weapon roll (item.roll)            | `pnpm run test:smoke`              |
| 3h   | Edit-difficulty chat-card flow     | `pnpm run test:smoke`              |
| 3i   | Auto-explosive resolution flow     | `pnpm run test:smoke`              |
| 4    | Multi-user / socket flows          | Manual (requires two clients)      |
| 5    | Migration from pre-v2 world        | Manual (requires backup world)     |

**Do not run Tiers 1–3 manually unless Playwright is unavailable or you are
diagnosing a specific failure.** The console blocks below are reference
material for ad-hoc investigation, not the primary test path.

---

## Tier 0 — Automated baseline

Run from repo root:

```bash
pnpm run check    # lint + typecheck + unit tests
pnpm run build    # JS bundle, SCSS, packs, translations
```

Expected: 0 lint errors (warnings tolerated), 0 type errors, 152/152 unit
tests pass (`src/**/*.test.ts`), 237/237 domain tests pass
(`tests/domain/**/*.test.ts`), bundle ~622 KB at `src/module/nonex-ist-od6s.js`, 14
LevelDB packs in `src/packs/`. The `starships` pack is intentionally empty.

---

## Tiers 1–3 — Playwright smoke suite

```bash
pnpm run test:smoke
```

Requires a running Foundry process at `localhost:30000` with the `nonex-ist-od6s`
system installed. Configure via env:

```text
FOUNDRY_URL=http://localhost:30000
FOUNDRY_USER=Gamemaster
FOUNDRY_GM_PASSWORD=            # per-user GM join password (blank for fresh worlds)
FOUNDRY_ADMIN_KEY=              # server admin password gating /setup (blank if Foundry has none)
FOUNDRY_SMOKE_WORLD=nonex-ist-od6s-smoke  # world id the suite owns
FOUNDRY_SYSTEM_ID=nonex-ist-od6s          # system to use when creating the world
```

Note: `FOUNDRY_PASSWORD` is intentionally *not* read by the smoke harness —
it is reserved for the foundryvtt.com website password that
`task foundry:start` uses to activate the container's license.

A `globalSetup` orchestrates the world lifecycle:

- If Foundry sits at `/auth`, submits the admin password.
- If Foundry sits at `/setup`, launches `nonex-ist-od6s-smoke` if it exists; creates
  it (system: `nonex-ist-od6s`) and launches it if it doesn't.
- If Foundry is already at `/join` or `/game`, attaches.

Each spec then asserts `game.world.id === FOUNDRY_SMOKE_WORLD` via
`loginAndWaitReady`, so a misconfigured run can't trample a developer's
personal campaign on the same Foundry instance. Suite fails fast (≈3 s)
with an actionable message on every failure mode.

Expected: **18/18 tests pass** with a `[smoke teardown]` line listing removed
actors/items. Any failure prints a screenshot path and trace zip for
`pnpm exec playwright show-trace <path>`.

### What the suite covers

- **Tier 1** (`tier-1-boot`): system manifest, 6 actor + 19 item data models
  registered, sheet classes installed, all 14 packs reachable, `w`/`b` dice
  terms, ≥26 status effects with v14 `name`/`img` schema, socketlib active.
- **Tier 2** (`tier-2-sheets`): all actor and item type sheets render without
  errors; every item sheet contains a `<prose-mirror>` element.
- **Tier 3a** (`tier-3-settings`): every `nonex-ist-od6s.*` settings menu renders a
  `<form>`.
- **Tier 3b** (`tier-3-roll`): attribute roll → dialog opens → submit →
  chat message created, zero v14 deprecation warnings.
- **Tier 3b** (`tier-3-skill-roll`): skill item roll → dialog opens → submit
  → chat message created.
- **Tier 3c** (`tier-3-wounds`): wound transitions Healthy → Wounded →
  Severely Wounded; `toggleStatusEffect` fires without schema errors.
- **Tier 3d** (`tier-3-combat`): scene + combat creation, combatant added,
  initiative rolled, teardown.
- **Tier 3e** (`tier-3-damage`): `applyDamage` on a vehicle actor transitions
  `NONEX_IST_OD6S.NO_DAMAGE` → `NONEX_IST_OD6S.DAMAGE_VERY_LIGHT` → `NONEX_IST_OD6S.DAMAGE_HEAVY`;
  `applyWounds` escalates a character to Incapacitated without schema errors.
- **Tier 3f** (`tier-3-vehicle`): vehicle actor schema fields (`scale`,
  `maneuverability`, `move`, `crew`) initialise correctly; vehicle item
  (compendium entry type) creates without errors.
- **Tier 3g** (`tier-3-weapon-roll`): weapon item `roll()` → dialog opens →
  submit → chat message with `damageScore` flag set.
- **Tier 3h** (`tier-3-edit-difficulty`): attribute roll → message stamped
  with known difficulty → edit-difficulty dialog → submit → `difficulty` and
  `baseDifficulty` flags updated on the message.
- **Tier 3i** (`tier-3-explosive`): auto-explosive resolution flow with the
  PIXI placement preview bypassed — pre-creates the Region + pending flag,
  then asserts the four branches the manual smoke covered: success stamps
  `originalOwner`/`templateId`; failure runs `scatterExplosive` without
  `ReferenceError` and stamps `originalX`/`originalY` on the region (the
  canonical "scatter ran" sentinel — post-scatter shape position is
  unreliable because a 1d6 scatter against the scene-boundary
  `testCollision` wall is clipped back to ~origin);
  `explosive_end_of_round=false` reveals the region (`visibility=2`);
  `explosive_end_of_round=true` defers the reveal (`visibility=1`).
- **Tier 5** (`tier-5-settings-migration`): seeds legacy `od6s.*` world
  settings, rewinds `migrationVersion`, reloads to re-fire `migrateWorld()`,
  and asserts they are copied to `nonex-ist-od6s.*` with `systems/od6s/` paths
  rewritten — while a value already set under the new id is left untouched.

---

## Console blocks — ad-hoc diagnosis only

Use these when a Playwright test fails and you need to narrow down the cause
in a live browser session. They replicate what the specs assert.

### Tier 1 — Boot & registration

```js
(() => {
  const r = {};
  r.system = game.system?.id + ' v' + game.system?.version;
  r.foundry = game.version;
  r.actor = Object.keys(CONFIG.Actor.dataModels || {});
  r.item  = Object.keys(CONFIG.Item.dataModels || {});
  r.actorSheet = CONFIG.Actor.sheetClasses?.character?.[`${game.system.id}.OD6SActorSheet`]?.cls?.name;
  r.itemSheet  = CONFIG.Item.sheetClasses?.skill?.[`${game.system.id}.OD6SItemSheet`]?.cls?.name;
  r.packs = game.packs.filter(p => p.metadata.packageName === 'nonex-ist-od6s').map(p => p.metadata.name);
  r.dice = {w: !!CONFIG.Dice.terms?.w, b: !!CONFIG.Dice.terms?.b};
  r.statusEffects = CONFIG.statusEffects?.length;
  r.socketlib = !!game.modules.get('socketlib')?.active;
  console.table(r);
  return r;
})();
```

Expect: `actor` has 6 entries, `item` has 19, both sheet classes present, 14
packs, both dice terms, ≥26 status effects, socketlib active.

### Tier 2 — Sheet rendering

```js
(async () => {
  const errs = [];
  const proseChecks = [];
  const actorTypes = ['character','npc','creature','vehicle','starship','container'];
  const itemTypes  = ['skill','specialization','advantage','disadvantage','specialability',
                      'armor','weapon','gear','cybernetic','manifestation','character-template',
                      'action','vehicle','vehicle-weapon','vehicle-gear','starship-weapon',
                      'starship-gear','species-template','item-group'];
  const opened = [];
  for (const t of actorTypes) {
    try {
      const a = await Actor.create({name:`smoke-${t}`, type:t}, {render:false});
      try { await a.sheet.render(true); opened.push(a.sheet); }
      catch(e) { errs.push(`actor ${t}: ${e.message}`); }
    } catch(e) { errs.push(`actor ${t} create: ${e.message}`); }
  }
  for (const t of itemTypes) {
    try {
      const i = await Item.create({name:`smoke-${t}`, type:t, system:{description:'<p>hello</p>'}}, {render:false});
      try {
        await i.sheet.render(true); opened.push(i.sheet);
        await new Promise(r => setTimeout(r, 100));
        proseChecks.push(`${t}: ${i.sheet.element?.querySelector('prose-mirror') ? 'OK' : 'MISSING'}`);
      } catch(e) { errs.push(`item ${t}: ${e.message}`); }
    } catch(e) { errs.push(`item ${t} create: ${e.message}`); }
  }
  await new Promise(r => setTimeout(r, 1000));
  for (const s of opened) { try { await s.close(); } catch {} }
  console.log('errors:', errs);
  console.log('prose-mirror:', proseChecks);
})();
```

Expect: `errors: []`, every item `OK`.

### Tier 3b — Roll flow

```js
(async () => {
  const actor = game.actors.find(a => a.name === 'smoke-character');
  if (!actor) return console.log('run Tier 2 first');
  if (actor.system.attributes.agi.base < 1)
    await actor.update({'system.attributes.agi.base': 10});

  const warns = [];
  const origWarn = foundry.utils.logCompatibilityWarning;
  foundry.utils.logCompatibilityWarning = (m, o) => { warns.push(m); return origWarn.call(foundry.utils, m, o); };

  const before = new Set([...foundry.applications.instances.keys()]);
  await actor.rollAttribute('agi');
  await new Promise(r => setTimeout(r, 300));
  const dlg = [...foundry.applications.instances.values()]
    .find(a => !before.has(a.id) && a.constructor.name.includes('RollDialog'));

  let chat = false;
  if (dlg) {
    const n = game.messages.size;
    dlg.element.querySelector('[data-action="submit"]')?.click();
    await new Promise(r => setTimeout(r, 600));
    chat = game.messages.size > n;
    try { await dlg.close(); } catch {}
  }
  foundry.utils.logCompatibilityWarning = origWarn;
  console.log({dialogOpened: !!dlg, chatCreated: chat, warns});
})();
```

Expect: `dialogOpened: true`, `chatCreated: true`, `warns: []`.

### Tier 3c — Wound flow

```js
(async () => {
  const actor = game.actors.find(a => a.name === 'smoke-character');
  if (!actor) return console.log('run Tier 2 first');

  const errs = [];
  const onRej = e => errs.push('rej: ' + (e.reason?.message || e.reason));
  window.addEventListener('unhandledrejection', onRej);

  await actor.update({'system.wounds.value': 0});
  for (const e of [...actor.effects.contents]) { try { await e.delete(); } catch {} }

  await actor.applyWounds('NONEX_IST_OD6S.WOUNDS_WOUNDED').catch(e => errs.push(e.message));
  const w = actor.system.wounds.value;
  await actor.applyWounds('NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED').catch(e => errs.push(e.message));
  const s = actor.system.wounds.value;
  await actor.toggleStatusEffect('stunned', {active: true}).catch(e => errs.push(e.message));
  await new Promise(r => setTimeout(r, 200));

  window.removeEventListener('unhandledrejection', onRej);
  await actor.update({'system.wounds.value': 0});
  for (const e of [...actor.effects.contents]) { try { await e.delete(); } catch {} }

  console.log({afterWounded: w, afterSevere: s, errs});
})();
```

Expect: `afterWounded > 0`, `afterSevere > afterWounded`, `errs: []`.

### Tier 3d — Combat & initiative

```js
(async () => {
  const actor = game.actors.find(a => a.name === 'smoke-character');
  if (!actor) return console.log('run Tier 2 first');

  const out = {};
  try {
    const scene = game.scenes.active || await Scene.create({name:'test-scene', active:true});
    let tok = scene.tokens.find(t => t.actorId === actor.id);
    if (!tok) {
      const td = await actor.getTokenDocument({x:100, y:100});
      [tok] = await scene.createEmbeddedDocuments('Token', [td.toObject()]);
    }
    const combat = await Combat.create({scene: scene.id});
    await combat.activate();
    await combat.createEmbeddedDocuments('Combatant', [{tokenId:tok.id, actorId:actor.id, sceneId:scene.id}]);
    await combat.rollInitiative([combat.combatants.contents[0].id]);
    out.initRolled = combat.combatants.contents[0].initiative !== null;
    await combat.delete();
    if (scene.name === 'test-scene') await scene.delete();
    out.cleanup = 'ok';
  } catch(e) { out.err = e.message; }
  console.log(out);
})();
```

Expect: `initRolled: true`, `cleanup: 'ok'`, no `err`.

---

## Cleanup

```js
(async () => {
  const a = game.actors.filter(x => x.name?.startsWith('smoke-')).map(x => x.id);
  const i = game.items.filter(x => x.name?.startsWith('smoke-')).map(x => x.id);
  await Actor.deleteDocuments(a);
  await Item.deleteDocuments(i);
  console.log({actors: a.length, items: i.length});
})();
```

---

## Tier 4 — Multi-user (manual)

Requires two browser clients connected to the same world.

- [ ] Vehicle crew sync — drag a character into a vehicle's crew slot from one
      client; the other client sees the update.
- [ ] Roll updates — a player roll appears on the GM's chat with correct flags.
- [ ] Explosive region sync — placing an explosive's blast region on one client
      renders on the other.

---

## Tier 5 — Migration (manual)

The `od6s` → `nonex-ist-od6s` settings migration is covered automatically by
`tier-5-settings-migration` (see the suite list above). The checks below need
a real pre-v2 world backup and stay manual.

If a backup of a pre-v2 world exists:

- [ ] Load the world; check console for migration errors.
- [ ] Open a pre-existing character sheet — attributes, skills, inventory all
      populated.
- [ ] Open a pre-existing weapon item — damage, range, modifiers preserved.
- [ ] Existing chat messages still render.
- [ ] Existing combat trackers, if any, can resume.

---

## Known manual-only gaps

- **Edit-difficulty / edit-damage on chat cards** — hooks fire from DOM events
  on rendered chat messages; click the modify buttons on a live roll manually.
- **Choose-target dialog** — requires a token + target + opposed roll.
- **Explosives placement preview** (PIXI mouse-track → click-to-confirm) —
  the canvas placement UI itself. The post-placement resolution flow is
  covered by Tier 3i; this gap is just the preview layer that drives
  `ExplosivesTemplate.drawPreview()`.
- **Character creation wizard** — multi-step stateful UI; open
  `OD6SCharacterCreation` against a fresh character actor and step through
  manually.
- **Wound status icons on player-owned actors** — the wound hook only toggles
  status icons for non-owned actors when the user is GM; test on an NPC.
