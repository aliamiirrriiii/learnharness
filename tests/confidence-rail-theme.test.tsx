/** The confidence rail follows the page's theme tokens (teeez, 2026-11-08). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { confidenceRailStyle } from "../components/confidence-rail.tsx";

test("the rail's empty side and ticks come from the page's tokens, not dark literals", () => {
	const style = confidenceRailStyle(50);
	assert.equal(style.backgroundColor, "var(--background)");
	assert.match(String(style.backgroundImage), /color-mix\(in srgb, var\(--foreground\) 35%, transparent\)/);
	assert.doesNotMatch(JSON.stringify(style), /#141414|rgba\(230,230,230/);
});
