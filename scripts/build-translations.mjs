#!/usr/bin/env node

/**
 * Generate Babele translation base files from compendium YAML sources.
 * Reads compendia/*.yaml → writes src/lang/translations/en/*.json
 */

import fs from "fs";
import path from "path";
import { loadAll } from "js-yaml";

const PACK_SRC = "./compendia";
const TRANSLATIONS_DEST = "./src/lang/translations/en";
const SYSTEM_JSON = "./src/system.json";

// Babele looks translation files up by compendium collection id
// (`<systemId>.<pack name>`), which is not always the source folder name:
// e.g. folder `special-abilities` is the pack named `specialabilities`.
const system = JSON.parse(fs.readFileSync(SYSTEM_JSON, "utf8"));
const packNameByFolder = new Map(
  system.packs.map((pack) => [path.basename(pack.path), pack.name])
);

function buildTranslations() {
  fs.mkdirSync(TRANSLATIONS_DEST, { recursive: true });

  const folders = fs.readdirSync(PACK_SRC).filter((file) =>
    fs.statSync(path.join(PACK_SRC, file)).isDirectory()
  );

  for (const folder of folders) {
    const srcDir = path.join(PACK_SRC, folder);
    const packName = packNameByFolder.get(folder);
    if (!packName) {
      console.warn(`  Skipping ${folder}: no pack with path packs/${folder} in system.json`);
      continue;
    }
    const jsonPath = path.join(TRANSLATIONS_DEST, `${system.id}.${packName}.json`);

    let label = folder.replace(/-/g, " ");
    label = label.replace(/(^\w)|(\s+\w)/g, (letter) => letter.toUpperCase());

    const entries = {};

    const yamlFiles = fs
      .readdirSync(srcDir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    for (const yamlFile of yamlFiles) {
      const content = fs.readFileSync(path.join(srcDir, yamlFile), "utf8");
      const docs = loadAll(content);
      for (const doc of docs) {
        if (!doc || !doc.name) continue;
        entries[doc.name] = {
          name: doc.name,
          description: doc.system?.description ?? "",
        };
      }
    }

    const output = {
      label,
      mapping: {
        description: "system.description",
      },
      entries,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + "\n");
    console.log(`  Built translations: ${folder}`);
  }
}

console.log("Building translation base files...");
buildTranslations();
console.log("Done.");
