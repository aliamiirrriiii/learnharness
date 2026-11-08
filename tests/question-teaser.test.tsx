/** The collapsed question bar's one-line teaser (components/question-dock.tsx). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { teaserText } from "../components/question-dock.tsx";

test("a code question's teaser shows the question, not a run of flattened code (teeez, 2026-11-08)", () => {
	const q = "با جدول وضعیت ردگیری کن. چه چیزی چاپ می‌شود؟\n\n```python\np = 2\nq = p * 3\nprint(p, q)\n```";
	assert.equal(teaserText(q), "با جدول وضعیت ردگیری کن. چه چیزی چاپ می‌شود؟ …");
});

test("inline code loses its backticks, math still unwraps", () => {
	assert.equal(teaserText("کلاس `OrderService` و $x^2$"), "کلاس OrderService و x^2");
});
