/** Every literal passed to t() or plural() has Persian (lib/i18n/fa/), the
 * Persian keeps the source's placeholders, and it is written in Persian
 * letters: Arabic ي and ك, which imports and some keyboards produce, are
 * refused. The scan reads the source text, so it sees every call site,
 * rendered or not. */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { FA, FA_PARTS } from "../lib/i18n/fa/index.ts";
import { formatNumber, translate } from "../lib/i18n/index.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN = ["app", "components", "lib", "src"];

function files(dir: string): string[] {
	const out: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...files(full));
		else if (/\.(ts|tsx)$/.test(entry.name) && !full.includes(`${path.sep}i18n${path.sep}`)) out.push(full);
	}
	return out;
}

// A string literal in any quote style, without template interpolation.
const LITERAL = String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\`(?:[^\`\\$]|\\.)*\`)`;
const T_CALL = new RegExp(String.raw`\bt\(\s*` + LITERAL, "g");
const PLURAL_CALL = new RegExp(String.raw`\bplural\(\s*[^,]+,\s*` + LITERAL + String.raw`\s*,\s*` + LITERAL, "g");
const unquote = (literal: string): string => {
	const body = literal.slice(1, -1);
	return literal.startsWith("`") ? body.replace(/\\`/g, "`") : JSON.parse(`"${body.replace(/\\'/g, "'").replace(/(?<!\\)"/g, '\\"')}"`);
};

function sourceKeys(): Map<string, string> {
	const keys = new Map<string, string>();
	for (const file of SCAN.flatMap((d) => files(path.join(ROOT, d)))) {
		const text = fs.readFileSync(file, "utf8");
		if (!/\b(t|plural)\(/.test(text) || !text.includes("@/lib/i18n")) continue;
		const where = path.relative(ROOT, file);
		for (const m of text.matchAll(T_CALL)) keys.set(unquote(m[1]!), where);
		for (const m of text.matchAll(PLURAL_CALL)) { keys.set(unquote(m[1]!), where); keys.set(unquote(m[2]!), where); }
	}
	return keys;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("Persian UI coverage", () => {
	const keys = sourceKeys();

	it("every wrapped string has Persian", () => {
		const missing = [...keys].filter(([key]) => !(key in FA)).map(([key, file]) => `${file}: ${JSON.stringify(key)}`);
		assert.deepEqual(missing, [], `missing Persian for ${missing.length} strings`);
	});

	it("Persian keeps every placeholder and none is empty", () => {
		const bad = Object.entries(FA).filter(([en, fa]) => !fa.trim() || placeholders(en).join() !== placeholders(fa).join());
		assert.deepEqual(bad, []);
	});

	it("is written with Persian ی and ک, not Arabic ي and ك", () => {
		const arabic = Object.entries(FA).filter(([, fa]) => /[يك]/.test(fa));
		assert.deepEqual(arabic, []);
	});

	it("parts agree where they share a string", () => {
		const seen = new Map<string, string>();
		const clashes: string[] = [];
		for (const part of Object.values(FA_PARTS)) {
			for (const [en, fa] of Object.entries(part)) {
				if (seen.has(en) && seen.get(en) !== fa) clashes.push(en);
				seen.set(en, fa);
			}
		}
		assert.deepEqual(clashes, []);
	});
});

describe("translate", () => {
	it("fills placeholders, with locale digits for numbers", () => {
		const dict = { "{n} sources": "{n} منبع", "Hi {name}": "سلام {name}" };
		assert.equal(translate("{n} sources", { n: 12 }, dict, "fa"), "۱۲ منبع");
		assert.equal(translate("Hi {name}", { name: "Ali" }, dict, "fa"), "سلام Ali");
		assert.equal(translate("{n} sources", { n: 12 }, {}, "en"), "12 sources");
		assert.equal(translate("Untranslated", undefined, dict, "fa"), "Untranslated");
		assert.equal(formatNumber(1234, undefined, "fa"), "۱٬۲۳۴");
	});
});
