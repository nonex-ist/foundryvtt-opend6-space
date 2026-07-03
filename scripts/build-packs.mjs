#!/usr/bin/env node

/**
 * Build compendium packs from YAML source files.
 * Converts compendia/*.yaml → src/packs/ (LevelDB format via @foundryvtt/foundryvtt-cli)
 *
 * Each document is given a `_key` of `!<collection>!<id>` (or for embedded
 * effects, `!<collection>.effects!<parentId>.<id>`). Without `_key` the CLI
 * silently skips the document, leaving an empty pack.
 */

import fs from "fs";
import path from "path";
import { loadAll } from "js-yaml";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const PACK_SRC = "./compendia";
const PACK_DEST = "./src/packs";
const SYSTEM_JSON = "./src/system.json";

// Foundry document type → collection name (matches CLI's TYPE_COLLECTION_MAP).
const TYPE_COLLECTION_MAP = {
  Actor: "actors",
  Item: "items",
  Macro: "macros",
  JournalEntry: "journal",
  RollTable: "tables",
  Scene: "scenes",
  Adventure: "adventures",
  Cards: "cards",
  Playlist: "playlists",
};

// Mirror of CLI's HIERARCHY — embedded collections per parent collection.
// Used to recursively assign _key to embedded documents.
const EMBEDDED_HIERARCHY = {
  actors: ["items", "effects"],
  items: ["effects"],
  cards: ["cards"],
  combats: ["combatants", "groups"],
  journal: ["pages", "categories"],
  playlists: ["sounds"],
  regions: ["behaviors"],
  tables: ["results"],
};

/**
 * Recursively assign _key fields to a document and its embedded children.
 * Format: !<collection>!<id> for top-level, !<parentCollection>.<embeddedCollection>!<parentKey>.<id> for embedded.
 */
function assignKeys(doc, collection, parentKey = null) {
  if (!doc._id) {
    doc._id = generateId(doc.name || JSON.stringify(doc).slice(0, 32));
  }
  doc._key = parentKey
    ? `!${parentKey.split("!")[1]}.${collection}!${parentKey.split("!")[2]}.${doc._id}`
    : `!${collection}!${doc._id}`;

  for (const embedded of EMBEDDED_HIERARCHY[collection] ?? []) {
    const value = doc[embedded];
    if (Array.isArray(value)) {
      for (const child of value) assignKeys(child, embedded, doc._key);
    }
  }
}

async function buildPacks() {
  // Read system.json to map pack folder → document type
  const systemData = JSON.parse(fs.readFileSync(SYSTEM_JSON, "utf8"));
  const packTypeByPath = {};
  for (const pack of systemData.packs) {
    const folder = path.basename(pack.path);
    packTypeByPath[folder] = pack.type;
  }

  // Clean existing packs
  if (fs.existsSync(PACK_DEST)) {
    fs.rmSync(PACK_DEST, { recursive: true });
  }
  fs.mkdirSync(PACK_DEST, { recursive: true });

  const folders = fs.readdirSync(PACK_SRC).filter((file) =>
    fs.statSync(path.join(PACK_SRC, file)).isDirectory()
  );

  for (const folder of folders) {
    const srcDir = path.join(PACK_SRC, folder);
    const tmpDir = path.join(PACK_DEST, `_${folder}_src`);
    const destDir = path.join(PACK_DEST, folder);

    const documentType = packTypeByPath[folder];
    if (!documentType) {
      console.warn(`  Skipping ${folder}: not declared in system.json packs`);
      continue;
    }
    const collection = TYPE_COLLECTION_MAP[documentType];
    if (!collection) {
      throw new Error(`Unknown document type "${documentType}" for pack ${folder}`);
    }

    // Create a temp directory with JSON files converted from YAML
    fs.mkdirSync(tmpDir, { recursive: true });

    const yamlFiles = fs
      .readdirSync(srcDir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    let count = 0;
    for (const yamlFile of yamlFiles) {
      const content = fs.readFileSync(path.join(srcDir, yamlFile), "utf8");
      const docs = loadAll(content);
      for (const doc of docs) {
        if (!doc) continue;
        assignKeys(doc, collection);
        const jsonFile = `${doc._id}.json`;
        fs.writeFileSync(
          path.join(tmpDir, jsonFile),
          JSON.stringify(doc, null, 2)
        );
        count++;
      }
    }

    // Use foundryvtt-cli to compile JSON → LevelDB
    await compilePack(tmpDir, destDir);

    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true });

    console.log(`  Built pack: ${folder} (${count} documents)`);
  }
}

/**
 * Generate a deterministic 16-char hex ID from a string.
 */
function generateId(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
}

console.log("Building compendium packs...");
buildPacks()
  .then(() => console.log("Done."))
  .catch((err) => {
    console.error("Failed to build packs:", err);
    process.exit(1);
  });
