/** A Persian build (NEXT_PUBLIC_LH_LOCALE=fa) teaches in Persian: every
 * agent's instructions end with prompts/locale/fa.md, after the source and
 * any override, so turning on a prompt override cannot drop it. The English
 * build is pinned byte for byte by tests/prompt-overrides.test.ts. */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

process.env.LH_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "lh-locale-"));
process.env.NEXT_PUBLIC_LH_LOCALE = "fa";
const { composeInstructions } = await import("../src/agent/teacher-agent.ts");
const FA = fs.readFileSync(path.join(import.meta.dirname, "..", "src", "agent", "prompts", "locale", "fa.md"), "utf-8").trim();

describe("Persian teaching language", () => {
	for (const kind of ["prober", "teacher", "practice"] as const) {
		it(`${kind} instructions end with the Persian fragment`, () => {
			const text = composeInstructions(kind);
			assert.ok(text.endsWith(FA), kind);
			assert.equal(text.split(FA).length, 2, "once");
		});
	}
	it("survives every override switch being on with empty files", () => {
		assert.ok(composeInstructions("teacher", { "system-prompt.md": true }).endsWith(FA));
	});
	it("uses Persian ی and ک", () => {
		const persianPart = FA.slice(FA.indexOf("# فارسی‌نویسی"));
		assert.doesNotMatch(persianPart, /[يك]/);
	});
});
