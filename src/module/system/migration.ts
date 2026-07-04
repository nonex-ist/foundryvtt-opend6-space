/**
 * System data migration for world upgrades.
 * Runs once per version bump via the system version stored in world settings.
 *
 * Two-tier migration policy
 * -------------------------
 * 1. **Per-document field-shape changes** (rename a `system.*` field, change
 *    a default, switch a field type): override `static migrateData(source)`
 *    on the relevant `TypeDataModel` subclass. Foundry calls it during
 *    construction, *before* validation, so old documents load cleanly the
 *    first time the world opens. See `src/module/data/item/weapon.ts` for
 *    an example (range NumberField → StringField, subtype i18n-key →
 *    localized) and `src/module/data/item/weapon-migration.ts` +
 *    `weapon.test.ts` for the pure-helper / unit-test pattern.
 *
 * 2. **Cross-document, flag-level, or scene-level changes** stay in this
 *    file as a `MIGRATION_STEPS` entry. These run once per world via the
 *    stored `migrationVersion` setting and can iterate `game.actors`,
 *    `game.scenes.tokens`, etc. — things `migrateData` can't reach because
 *    it only sees one document's `source` object.
 *
 * To audit before/after document state, persist the debug flag *before*
 * reloading the world (otherwise migrations fire on the `ready` hook before
 * you can touch the console):
 *
 *   localStorage.od6sDebug = '["migration"]'
 *
 * Each touched actor will then log a `[before]` and `[after]` snapshot.
 */

import { debug, error as logError, isDebugEnabled } from "./logger";
import { SCHEMA_VERSION_KEY } from "./schema-version";
import { collectLegacyLabelUpdates } from "./migration-labels";

/**
 * Migration steps in version order. Each entry runs when the world's stored
 * `migrationVersion` is older than `since`. Add new steps to the end; the
 * highest `since` becomes the recorded `migrationVersion` after a clean run.
 */
const MIGRATION_STEPS: Array<{ since: string; run: () => Promise<void> }> = [
  {
    since: "2.0.0",
    run: async () => {
      await migrateExplosiveTemplateFlags();
      await migrateChatMessageFlags();
    },
  },
  {
    since: "2.2.0",
    run: () => migrateStatusEffectIcons(),
  },
  {
    since: "2.5.0",
    run: () => migrateExplosivePendingFlags(),
  },
  {
    since: "2.6.0",
    run: () => stampAllSchemaVersions(),
  },
  {
    // 3.0.0 system-id rename left world settings stranded under the old
    // `od6s.*` namespace. Copy them onto `nonex-ist-od6s.*` so GMs don't
    // re-enter Wild Die faces, labels, deadliness, etc. by hand.
    since: "3.0.1",
    run: () => migrateLegacySettings(),
  },
  {
    // #189: labels persisted as i18n keys in `system` data still point at the
    // retired `OD6S.*` root, so migrated sheets show the raw reference (e.g.
    // `OD6S.Char_Char_Points_Short`) instead of the localized label.
    since: "3.0.2",
    run: async () => {
      await repairLegacyLabelKeys();
    },
  },
];

// Bumped manually for the 3.0.0 system-id rename. The pre-migration
// `migrateLegacyOd6sFlags()` runs unconditionally inside `migrateWorld()`
// before the version-gated steps, so older worlds (`<2.6.0`) have their
// flag bag rewritten before the legacy steps reach for them. 3.0.1 adds
// the `migrateLegacySettings()` step so worlds that already ran the 3.0.0
// flag migration still pick up their stranded `od6s.*` world settings. 3.0.2
// adds `repairLegacyLabelKeys()` to rewrite `OD6S.*` label keys still stored
// in document `system` data (#189).
const CURRENT_MIGRATION_VERSION = "3.0.2";

/**
 * Check if migration is needed and run it.
 * Called from the 'ready' hook.
 */
export async function migrateWorld() {
  if (!game.user.isGM) return;

  const lastMigration = game.settings.get("nonex-ist-od6s", "migrationVersion") ?? "0";
  if (!foundry.utils.isNewerVersion(CURRENT_MIGRATION_VERSION, lastMigration)) return;

  // V14 returns a Notification object with a bound .remove(); the project's
  // type stubs predate this, so cast through unknown.
  const inProgress = ui.notifications.info(
    "OpenD6 Space: Migrating world data — please be patient.",
    { permanent: true },
  ) as unknown as { remove?: () => void } | undefined;

  debug("migration", "starting", {
    from: lastMigration,
    to: CURRENT_MIGRATION_VERSION,
    actors: game.actors.size,
    items: game.items.size,
    scenes: game.scenes.size,
  });

  try {
    // 3.0.0 system-id rename: copy any leftover `flags.od6s.*` payload onto
    // `flags.nonex-ist-od6s.*` before the older version-gated steps run, so
    // their `getFlag("nonex-ist-od6s", …)` reads find the data.
    await migrateLegacyOd6sFlags();

    for (const step of MIGRATION_STEPS) {
      if (foundry.utils.isNewerVersion(step.since, lastMigration)) {
        await step.run();
      }
    }

    // Record completion
    await game.settings.set("nonex-ist-od6s", "migrationVersion", CURRENT_MIGRATION_VERSION);
    ui.notifications.info("OpenD6 Space: Migration complete.");
  } catch (err) {
    logError("migration", "Migration failed:", err);
    ui.notifications.error("OpenD6 Space: Migration failed. Check the console for details.");
  } finally {
    inProgress?.remove?.();
  }
}

/**
 * Register the migration version setting.
 * Called during system init.
 */
export function registerMigrationSetting() {
  game.settings.register("nonex-ist-od6s", "migrationVersion", {
    name: "Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0",
  });
}

/**
 * Update active effect icons that still reference old .png paths to .svg equivalents.
 * Affects any effect whose img is under systems/nonex-ist-od6s/ and ends with .png.
 */
async function migrateStatusEffectIcons() {
  debug("migration", "Migrating status effect icons from .png to .svg...");
  let count = 0;

  for (const actor of game.actors) {
    const updates = [];
    for (const effect of actor.effects) {
      const img: string = effect.img ?? "";
      if (img.startsWith("systems/nonex-ist-od6s/") && img.endsWith(".png")) {
        updates.push({ _id: effect.id, img: img.replace(/\.png$/, ".svg") });
      }
    }
    if (updates.length > 0) {
      logActorBefore("icons", actor);
      await actor.updateEmbeddedDocuments("ActiveEffect", updates);
      logActorAfter("icons", actor);
      count += updates.length;
    }
  }

  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      const updates = [];
      for (const effect of token.actor?.effects ?? []) {
        const img: string = effect.img ?? "";
        if (img.startsWith("systems/nonex-ist-od6s/") && img.endsWith(".png")) {
          updates.push({ _id: effect.id, img: img.replace(/\.png$/, ".svg") });
        }
      }
      if (updates.length > 0) {
        logActorBefore("icons", token.actor, ` (token in ${scene.name})`);
        await token.actor.updateEmbeddedDocuments("ActiveEffect", updates);
        logActorAfter("icons", token.actor, ` (token in ${scene.name})`);
        count += updates.length;
      }
    }
  }

  debug("migration", `Updated ${count} status effect icons.`);
}

/** Snapshot an actor's full document state (deep-cloned via toObject) for audit logs. */
function logActorBefore(step: string, actor: any, suffix = "") {
  if (!isDebugEnabled("migration")) return;
  debug("migration", `[${step}:before] ${actor.name}${suffix}`, actor.toObject());
}
function logActorAfter(step: string, actor: any, suffix = "") {
  if (!isDebugEnabled("migration")) return;
  debug("migration", `[${step}:after]  ${actor.name}${suffix}`, actor.toObject());
}

/**
 * Clean up item flags that reference old MeasuredTemplate IDs.
 * In v14, MeasuredTemplate documents no longer exist — these are dangling references.
 * Clear the explosive flags so items are in a clean state.
 */
async function migrateExplosiveTemplateFlags() {
  debug("migration", "Migrating explosive template flags on items...");
  let count = 0;

  for (const actor of game.actors) {
    const updates = [];
    for (const item of actor.items) {
      const explosiveTemplate = item.getFlag("nonex-ist-od6s", "explosiveTemplate");
      if (explosiveTemplate) {
        updates.push({
          _id: item.id,
          "flags.nonex-ist-od6s.-=explosiveTemplate": null,
          "flags.nonex-ist-od6s.-=explosiveSet": null,
          "flags.nonex-ist-od6s.-=explosiveOrigin": null,
          "flags.nonex-ist-od6s.-=explosiveRange": null,
        });
      }
    }
    if (updates.length > 0) {
      logActorBefore("explosive-flags", actor);
      await actor.updateEmbeddedDocuments("Item", updates);
      logActorAfter("explosive-flags", actor);
      count += updates.length;
    }
  }

  // Also check unowned items in the world collection
  const worldItemUpdates = [];
  for (const item of game.items) {
    const explosiveTemplate = item.getFlag("nonex-ist-od6s", "explosiveTemplate");
    if (explosiveTemplate) {
      worldItemUpdates.push({
        _id: item.id,
        "flags.nonex-ist-od6s.-=explosiveTemplate": null,
        "flags.nonex-ist-od6s.-=explosiveSet": null,
        "flags.nonex-ist-od6s.-=explosiveOrigin": null,
        "flags.nonex-ist-od6s.-=explosiveRange": null,
      });
    }
  }
  if (worldItemUpdates.length > 0) {
    await Item.updateDocuments(worldItemUpdates);
    count += worldItemUpdates.length;
  }

  debug("migration", `Cleaned explosive flags from ${count} items.`);
}

/**
 * Drop the legacy scalar explosive flags (`explosiveTemplate`, `explosiveOrigin`,
 * `explosiveRange`, `explosiveSet`). #40 replaces them with a per-region keyed
 * map at `flags.nonex-ist-od6s.explosivePending.<regionId>`. Stale scalars are transient
 * pending state — the regions they pointed at have been gone since the v14
 * migration, and the new code reads only the keyed map.
 */
async function migrateExplosivePendingFlags() {
  debug("migration", "Dropping legacy scalar explosive flags...");
  let count = 0;

  const drop = {
    "flags.nonex-ist-od6s.-=explosiveTemplate": null,
    "flags.nonex-ist-od6s.-=explosiveOrigin": null,
    "flags.nonex-ist-od6s.-=explosiveRange": null,
    "flags.nonex-ist-od6s.-=explosiveSet": null,
  };

  for (const actor of game.actors) {
    const updates = [];
    for (const item of actor.items) {
      if (item.getFlag("nonex-ist-od6s", "explosiveTemplate")
          || item.getFlag("nonex-ist-od6s", "explosiveOrigin")
          || item.getFlag("nonex-ist-od6s", "explosiveRange")
          || item.getFlag("nonex-ist-od6s", "explosiveSet")) {
        updates.push({ _id: item.id, ...drop });
      }
    }
    if (updates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", updates);
      count += updates.length;
    }
  }

  const worldItemUpdates = [];
  for (const item of game.items) {
    if (item.getFlag("nonex-ist-od6s", "explosiveTemplate")
        || item.getFlag("nonex-ist-od6s", "explosiveOrigin")
        || item.getFlag("nonex-ist-od6s", "explosiveRange")
        || item.getFlag("nonex-ist-od6s", "explosiveSet")) {
      worldItemUpdates.push({ _id: item.id, ...drop });
    }
  }
  if (worldItemUpdates.length > 0) {
    await Item.updateDocuments(worldItemUpdates);
    count += worldItemUpdates.length;
  }

  debug("migration", `Dropped legacy scalar explosive flags from ${count} items.`);
}

/**
 * Clean up chat message flags that reference old MeasuredTemplate IDs.
 * Remove template references and mark explosive messages as handled
 * so they don't try to interact with non-existent templates.
 */
async function migrateChatMessageFlags() {
  debug("migration", "Migrating chat message explosive flags...");
  let count = 0;

  const updates = [];
  for (const message of game.messages) {
    if (message.getFlag("nonex-ist-od6s", "isExplosive") && message.getFlag("nonex-ist-od6s", "template")) {
      updates.push({
        _id: message.id,
        "flags.nonex-ist-od6s.-=template": null,
        "flags.nonex-ist-od6s.handled": true,
      });
      count++;
    }
  }

  if (updates.length > 0) {
    await ChatMessage.updateDocuments(updates);
  }

  debug("migration", `Cleaned explosive flags from ${count} chat messages.`);
}

/**
 * #85: Stamp every actor + item with the running system version. Runs once
 * for any world upgrading past 2.6.0 — after this, new docs are stamped on
 * `_preCreate` and warning logic in `system/schema-version.ts` can rely on
 * the field being populated for in-world docs.
 *
 * We overwrite any existing stamp. The field didn't exist before 2.6.0, so
 * any pre-existing value can only come from a doc imported from a future
 * (>=2.6.0) world into a still-pre-2.6.0 world — vanishingly rare, and the
 * world's migration history (in the settings store) is the source of truth
 * at this point. New docs from 2.6.0 onward stamp themselves on `_preCreate`.
 */
async function stampAllSchemaVersions() {
  const version = game.system.version;
  debug("migration", `Stamping all docs with system schema version ${version}...`);
  let count = 0;

  const actorUpdates: Array<Record<string, unknown>> = [];
  for (const actor of game.actors) {
    actorUpdates.push({ _id: actor.id, [`system.${SCHEMA_VERSION_KEY}`]: version });

    const itemUpdates: Array<Record<string, unknown>> = [];
    for (const item of actor.items) {
      itemUpdates.push({ _id: item.id, [`system.${SCHEMA_VERSION_KEY}`]: version });
    }
    if (itemUpdates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", itemUpdates);
      count += itemUpdates.length;
    }
  }
  if (actorUpdates.length > 0) {
    await Actor.updateDocuments(actorUpdates);
    count += actorUpdates.length;
  }

  const worldItemUpdates: Array<Record<string, unknown>> = [];
  for (const item of game.items) {
    worldItemUpdates.push({ _id: item.id, [`system.${SCHEMA_VERSION_KEY}`]: version });
  }
  if (worldItemUpdates.length > 0) {
    await Item.updateDocuments(worldItemUpdates);
    count += worldItemUpdates.length;
  }

  debug("migration", `Stamped ${count} docs.`);
}

/**
 * #v3-rename: the system id changed from `od6s` to `nonex-ist-od6s`.
 * Foundry treats these as separate systems, so a world re-pointed at the new
 * id still carries every document's old `flags.od6s.*` payload. Copy each
 * legacy flag bag onto the new scope and drop the old one so downstream code
 * (which now reads from `flags.nonex-ist-od6s`) sees the data.
 *
 * We deliberately do *not* try to copy world-level settings: those live in
 * Foundry's per-system settings store and the new id starts with an empty
 * namespace. Users have to redo system-settings on the first load.
 */
async function migrateLegacyOd6sFlags() {
  debug("migration", "Copying legacy flags.od6s.* → flags.nonex-ist-od6s.* ...");
  let count = 0;

  const rewrite = (doc: any): Record<string, unknown> | null => {
    const legacy = doc.flags?.od6s;
    if (!legacy || Object.keys(legacy).length === 0) return null;
    return {
      _id: doc.id,
      "flags.nonex-ist-od6s": foundry.utils.mergeObject(
        doc.flags?.["nonex-ist-od6s"] ?? {},
        legacy,
        { inplace: false },
      ),
      "flags.-=od6s": null,
    };
  };

  // Actors and their embedded items
  for (const actor of game.actors) {
    const actorUpdate = rewrite(actor);
    if (actorUpdate) {
      await Actor.updateDocuments([actorUpdate]);
      count++;
    }
    const itemUpdates: Array<Record<string, unknown>> = [];
    for (const item of actor.items) {
      const u = rewrite(item);
      if (u) itemUpdates.push(u);
    }
    if (itemUpdates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", itemUpdates);
      count += itemUpdates.length;
    }
  }

  // World-level items
  const worldItemUpdates: Array<Record<string, unknown>> = [];
  for (const item of game.items) {
    const u = rewrite(item);
    if (u) worldItemUpdates.push(u);
  }
  if (worldItemUpdates.length > 0) {
    await Item.updateDocuments(worldItemUpdates);
    count += worldItemUpdates.length;
  }

  // Scenes and the tokens / token-actors they own
  for (const scene of game.scenes) {
    const sceneUpdate = rewrite(scene);
    if (sceneUpdate) {
      await Scene.updateDocuments([sceneUpdate]);
      count++;
    }
    const tokenUpdates: Array<Record<string, unknown>> = [];
    for (const token of scene.tokens) {
      const u = rewrite(token);
      if (u) tokenUpdates.push(u);
    }
    if (tokenUpdates.length > 0) {
      await scene.updateEmbeddedDocuments("Token", tokenUpdates);
      count += tokenUpdates.length;
    }
  }

  // Chat messages
  const messageUpdates: Array<Record<string, unknown>> = [];
  for (const message of game.messages) {
    const u = rewrite(message);
    if (u) messageUpdates.push(u);
  }
  if (messageUpdates.length > 0) {
    await ChatMessage.updateDocuments(messageUpdates);
    count += messageUpdates.length;
  }

  debug("migration", `Rewrote legacy od6s flags on ${count} documents.`);
}

/**
 * Copy world settings stranded under the old `od6s.*` namespace onto the
 * current `nonex-ist-od6s.*` namespace after the 3.0.0 system-id rename.
 *
 * Settings are stored as `Setting` documents in the world settings
 * collection, keyed by their full `<namespace>.<key>` string and holding a
 * JSON-encoded `value`. For each legacy `od6s.<key>` we:
 *   - skip keys the current system doesn't register (stale/removed settings);
 *   - skip `migrationVersion` (internal bookkeeping, set explicitly elsewhere);
 *   - skip any key the GM has already set under the new namespace, so a
 *     re-run never clobbers a value they re-entered by hand;
 *   - rewrite `systems/od6s/` asset paths to `systems/nonex-ist-od6s/`, which
 *     also repairs values still pointing at the old default icon folder.
 */
async function migrateLegacySettings() {
  debug("migration", "Copying legacy od6s.* world settings → nonex-ist-od6s.* ...");

  // `storage` isn't in the project's GameSettings type stub; cast through any
  // to reach it, then narrow the collection to the fields we read.
  type LegacySetting = { key: string; value: unknown };
  const worldSettings = (game.settings as any).storage.get("world") as
    | Iterable<LegacySetting>
    | undefined;
  if (!worldSettings) return;

  const existingKeys = new Set<string>();
  for (const s of worldSettings) existingKeys.add(s.key);

  let count = 0;
  for (const setting of [...worldSettings]) {
    const key: string = setting.key;
    if (!key.startsWith("od6s.")) continue;

    const suffix = key.slice("od6s.".length);
    if (suffix === "migrationVersion") continue;

    const newKey = `nonex-ist-od6s.${suffix}`;
    if (!game.settings.settings.has(newKey)) continue;
    if (existingKeys.has(newKey)) continue;

    let value: unknown = setting.value;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        // Not JSON-encoded — fall through with the raw string.
      }
    }
    if (typeof value === "string" && value.includes("systems/od6s/")) {
      value = value.replaceAll("systems/od6s/", "systems/nonex-ist-od6s/");
    }

    try {
      await game.settings.set("nonex-ist-od6s", suffix, value as never);
      count++;
    } catch (err) {
      logError("migration", `Failed to migrate setting ${key}:`, err);
    }
  }

  debug("migration", `Migrated ${count} legacy world settings.`);
}

/** Summary of a `repairLegacyLabelKeys()` sweep, for logs and the DM tools UI. */
export interface LabelRepairSummary {
  /** Documents (actors + items) that had at least one key rewritten. */
  documents: number;
  /** Total individual label fields rewritten across those documents. */
  fields: number;
}

/**
 * #189: several labels are persisted as i18n key strings inside `system` data
 * (e.g. `system.characterpoints.short_label`) and rendered with `{{localize}}`.
 * The 3.0.0 rename moved the i18n root `OD6S.* → NONEX_IST_OD6S.*`, but stored
 * values on migrated documents still point at the retired root, so sheets show
 * the raw reference (e.g. `OD6S.Char_Char_Points_Short`) instead of the label.
 *
 * Sweep every actor + item's `system` source and rewrite any string still
 * pointing at `OD6S.*` to the current key, but only when that key actually
 * resolves — see `collectLegacyLabelUpdates`. Attribute labels are ignored by
 * the sheet (it reads names from runtime config), but rewriting them here is
 * harmless and keeps the stored data consistent.
 *
 * Exported and idempotent (a second pass finds nothing) so a GM can re-run it
 * from the Maintenance tools without a version bump — the automatic migration
 * step below and the DM-triggered action share this one implementation.
 */
export async function repairLegacyLabelKeys(): Promise<LabelRepairSummary> {
  debug("migration", "Rewriting stored OD6S.* label keys → NONEX_IST_OD6S.* ...");
  const summary: LabelRepairSummary = { documents: 0, fields: 0 };

  const hasKey = (key: string) => game.i18n.has(key);

  const collect = (doc: any): Record<string, string> =>
    collectLegacyLabelUpdates(doc.system?.toObject?.() ?? doc.system, hasKey);

  const tally = (updates: Record<string, string>) => {
    summary.documents += 1;
    summary.fields += Object.keys(updates).length;
  };

  // Rewrite one actor (directory or synthetic token) plus its embedded items.
  const repairActor = async (actor: any, suffix = "") => {
    const changes = collect(actor);
    if (Object.keys(changes).length > 0) {
      logActorBefore("label-keys", actor, suffix);
      // dot-path keys update in place, so this works for both directory actors
      // and synthetic (unlinked-token) actors that carry their own delta.
      await actor.update(changes);
      logActorAfter("label-keys", actor, suffix);
      tally(changes);
    }
    const itemUpdates: Array<Record<string, unknown>> = [];
    for (const item of actor.items) {
      const u = collect(item);
      if (Object.keys(u).length > 0) {
        itemUpdates.push({ _id: item.id, ...u });
        tally(u);
      }
    }
    if (itemUpdates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", itemUpdates);
    }
  };

  for (const actor of game.actors) {
    await repairActor(actor);
  }

  // World-level items
  const worldItemUpdates: Array<Record<string, unknown>> = [];
  for (const item of game.items) {
    const u = collect(item);
    if (Object.keys(u).length > 0) {
      worldItemUpdates.push({ _id: item.id, ...u });
      tally(u);
    }
  }
  if (worldItemUpdates.length > 0) {
    await Item.updateDocuments(worldItemUpdates);
  }

  // Unlinked token actors carry their own `system` delta, so repair them too.
  // Linked tokens share the directory actor already handled above.
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      // `actorLink` isn't in the project's TokenDocument stub; reach it via any.
      if ((token as any).actorLink || !token.actor) continue;
      await repairActor(token.actor, ` (token in ${scene.name})`);
    }
  }

  debug(
    "migration",
    `Rewrote ${summary.fields} legacy label keys across ${summary.documents} documents.`,
  );
  return summary;
}
