/** Hosted mode (teeez fork): the settings record cannot widen learner-file
 * access or turn the demo tool back on, and uploads land inside the
 * person's uploads folder under names that cannot leave it. Runs on its
 * own LH_DATA_DIR with LH_HOSTED=1, set before any app module loads. */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lh-hosted-"));
process.env.LH_DATA_DIR = directory;
process.env.LH_AUTH_FILE = path.join(directory, "auth.json");
process.env.LH_HOSTED = "1";
after(() => fs.rmSync(directory, { recursive: true, force: true }));

const { HOSTED, UPLOADS_DIR, SETTINGS_FILE } = await import("../config.ts");
const { applyHostedPolicy, readFileAccessSettings, readSettings, writeSettings } = await import("../src/store/settings.ts");
const { fileAccessPolicy } = await import("../src/server/file-access.ts");
const { safeUploadName, uploadsResponse } = await import("../src/server/uploads.ts");

const WIDE = { version: 1, agent: { tools: { demo: true, research: true }, fileAccess: { restricted: false, folders: ["/"] } } };

describe("hosted settings policy", () => {
	it("reads LH_HOSTED", () => assert.equal(HOSTED, true));

	it("forces file access to the uploads folder and demo off on read", () => {
		fs.writeFileSync(SETTINGS_FILE, JSON.stringify(WIDE));
		const settings = readSettings();
		assert.deepEqual(settings?.agent?.fileAccess, { restricted: true, folders: [UPLOADS_DIR] });
		assert.equal(settings?.agent?.tools?.demo, false);
		assert.equal(settings?.agent?.tools?.research, true, "other toggles are the person's");
	});

	it("forces the same policy on write, whatever the body says", () => {
		const written = writeSettings(WIDE);
		assert.deepEqual(written.agent?.fileAccess, { restricted: true, folders: [UPLOADS_DIR] });
		assert.equal(written.agent?.tools?.demo, false);
		const onDisk = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
		assert.deepEqual(onDisk.agent.fileAccess, { restricted: true, folders: [UPLOADS_DIR] });
	});

	it("applies with no settings file and with a corrupt one", () => {
		fs.rmSync(SETTINGS_FILE, { force: true });
		assert.equal(readSettings()?.agent?.tools?.demo, false);
		fs.writeFileSync(SETTINGS_FILE, "{not json");
		assert.equal(readSettings()?.agent?.tools?.demo, false);
	});

	it("the file-access policy the tools read is the uploads folder", () => {
		fs.writeFileSync(SETTINGS_FILE, JSON.stringify(WIDE));
		assert.deepEqual(readFileAccessSettings(), { ok: true, settings: { restricted: true, folders: [UPLOADS_DIR] } });
		assert.deepEqual(fileAccessPolicy(), { restricted: true, folders: [UPLOADS_DIR] });
	});

	it("does nothing outside hosted mode", () => {
		const settings = { version: 1, agent: { tools: { demo: true } } };
		assert.deepEqual(applyHostedPolicy(settings, false), settings);
		assert.notDeepEqual(readFileAccessSettings(false), { ok: true, settings: { restricted: true, folders: [UPLOADS_DIR] } });
	});
});

describe("hosted uploads", () => {
	const upload = (files: File[], hosted = true) => {
		const form = new FormData();
		for (const file of files) form.append("files", file, file.name);
		return uploadsResponse(new Request("http://x/api/uploads", { method: "POST", body: form }), hosted, UPLOADS_DIR);
	};

	it("names cannot leave their folder or hide", () => {
		assert.equal(safeUploadName("../../etc/passwd"), "passwd");
		assert.equal(safeUploadName("..\\..\\x.txt"), "x.txt");
		assert.equal(safeUploadName(".bashrc"), "bashrc");
		assert.equal(safeUploadName("a\u0000b\nc.pdf"), "abc.pdf");
		assert.equal(safeUploadName(".."), "file");
		assert.equal(safeUploadName("یادداشت‌های درس.pdf"), "یادداشت‌های درس.pdf");
		const long = safeUploadName(`${"x".repeat(300)}.pdf`);
		assert.ok(long.length <= 120 && long.endsWith(".pdf"));
	});

	it("saves each file in its own folder under uploads and returns the paths", async () => {
		const response = await upload([new File(["one"], "notes.txt"), new File(["two"], "notes.txt")]);
		assert.equal(response.status, 200);
		const { paths } = await response.json() as { paths: string[] };
		assert.equal(paths.length, 2);
		assert.notEqual(paths[0], paths[1], "same name, different folders");
		for (const saved of paths) assert.ok(saved.startsWith(UPLOADS_DIR + path.sep), saved);
		assert.equal(fs.readFileSync(paths[0]!, "utf-8"), "one");
		assert.equal(fs.statSync(paths[0]!).mode & 0o777, 0o600);
	});

	it("a traversal name still lands inside uploads", async () => {
		const response = await upload([new File(["x"], "../../../outside.txt")]);
		const { paths } = await response.json() as { paths: string[] };
		assert.ok(paths[0]!.startsWith(UPLOADS_DIR + path.sep));
		assert.equal(path.basename(paths[0]!), "outside.txt");
	});

	it("refuses an empty request, too many files and too many bytes", async () => {
		assert.equal((await uploadsResponse(new Request("http://x/api/uploads", { method: "POST", body: new FormData() }), true, UPLOADS_DIR)).status, 400);
		assert.equal((await upload(Array.from({ length: 21 }, (_, i) => new File(["x"], `${i}.txt`)))).status, 413);
		assert.equal((await upload([new File([new Uint8Array(25 * 1024 * 1024 + 1)], "big.bin")])).status, 413);
	});

	it("is not found outside hosted mode", async () => {
		assert.equal((await upload([new File(["x"], "a.txt")], false)).status, 404);
	});
});

describe("hosted skin and chrome", () => {
	const read = (file: string) => fs.readFileSync(path.join(import.meta.dirname, "..", file), "utf-8");

	it("loads the host's skin only in hosted mode, before the body", () => {
		const layout = read("app/layout.tsx");
		assert.match(layout, /\{HOSTED_UI && \(\s*<head>[\s\S]*href="\/__host\/skin\.css"[\s\S]*src="\/__host\/skin\.js"[\s\S]*<\/head>/);
		assert.match(layout, /suppressHydrationWarning=\{HOSTED_UI\}/, "the skin script may change <html>'s class");
	});

	it("leaves dictation out of every composer in hosted mode", () => {
		for (const file of ["components/home.tsx", "components/new-session.tsx", "components/chat.tsx"]) {
			assert.match(read(file), /dictationSlot=\{HOSTED_UI \? undefined : <DictationBar/, file);
		}
	});
});
