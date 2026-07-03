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

function buildTranslations() {
  fs.mkdirSync(TRANSLATIONS_DEST, { recursive: true });

  const folders = fs.readdirSync(PACK_SRC).filter((file) =>
    fs.statSync(path.join(PACK_SRC, file)).isDirectory()
  );

  for (const folder of folders) {
    const srcDir = path.join(PACK_SRC, folder);
    const jsonPath = path.join(TRANSLATIONS_DEST, `nonex-ist-od6s.${folder}.json`);

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
