import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const KEY_RE = /["'`](NONEX_IST_OD6S\.[A-Z0-9_]+)["'`]/g;

/**
 * Literals that are key *prefixes* concatenated at runtime (or otherwise not
 * keys themselves). Keep this list small and justify each entry.
 */
const ALLOW_LIST = new Set<string>([]);

function walk(dir: string, exts: string[], out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, exts, out);
        else if (exts.some((e) => entry.name.endsWith(e)) && !entry.name.endsWith(".test.ts")) out.push(full);
    }
    return out;
}

describe("i18n keys", () => {
    it("every NONEX_IST_OD6S.* key referenced in code and templates exists in en.json", () => {
        const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lang/en.json"), "utf8")) as Record<string, string>;
        const files = [
            ...walk(path.join(ROOT, "src/module"), [".ts"]),
            ...walk(path.join(ROOT, "src/templates"), [".html"]),
        ];
        const missing = new Map<string, string[]>();
        for (const file of files) {
            const text = fs.readFileSync(file, "utf8");
            for (const m of text.matchAll(KEY_RE)) {
                const key = m[1];
                if (key in en || ALLOW_LIST.has(key)) continue;
                const rel = path.relative(ROOT, file);
                missing.set(key, [...(missing.get(key) ?? []), rel]);
            }
        }
        const report = [...missing.entries()].map(([k, f]) => `${k}  (${[...new Set(f)].join(", ")})`);
        expect(report, `Missing i18n keys in en.json:\n${report.join("\n")}`).toEqual([]);
    });
});
