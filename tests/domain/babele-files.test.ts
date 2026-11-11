import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Babele resolves a compendium translation file by collection id:
 * `<systemId>.<pack name>.json`. A file under any other name is silently
 * ignored at runtime, so guard the naming statically (this caught files left
 * on the pre-3.0.0 `od6s.` prefix and a folder-name/pack-name mismatch).
 */
const ROOT = process.cwd();
const TRANSLATIONS = path.join(ROOT, "src/lang/translations");

describe("Babele compendium translation files", () => {
    const system = JSON.parse(fs.readFileSync(path.join(ROOT, "src/system.json"), "utf8")) as {
        id: string;
        packs: Array<{name: string}>;
    };
    const valid = new Set(system.packs.map((p) => `${system.id}.${p.name}.json`));
    const langs = fs.readdirSync(TRANSLATIONS, {withFileTypes: true}).filter((d) => d.isDirectory());

    it("has at least the English base directory", () => {
        expect(langs.map((d) => d.name)).toContain("en");
    });

    for (const lang of langs) {
        it(`${lang.name}: every file is named <systemId>.<pack name>.json`, () => {
            const files = fs.readdirSync(path.join(TRANSLATIONS, lang.name)).filter((f) => f.endsWith(".json"));
            const stray = files.filter((f) => !valid.has(f));
            expect(stray, `files Babele would ignore in ${lang.name}/`).toEqual([]);
        });
    }

    it("en: every system pack has a base file", () => {
        const files = new Set(fs.readdirSync(path.join(TRANSLATIONS, "en")));
        const missing = [...valid].filter((f) => !files.has(f));
        expect(missing).toEqual([]);
    });
});
