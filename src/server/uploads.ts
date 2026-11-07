/**
 * Hosted mode's attachments (teeez fork). A browser File has no local path,
 * so in hosted mode the composer uploads it here and inserts the path it was
 * saved at. The message then carries a path inside UPLOADS_DIR, the one
 * folder the hosted file-access policy lets learner-file tools read
 * (store/settings.ts applyHostedPolicy). Each upload gets its own directory,
 * so two files with the same name never overwrite each other.
 */

import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { HOSTED, UPLOADS_DIR } from "../../config.ts";
import { MAX_IMPORT_BODY_BYTES, MAX_IMPORT_BYTES } from "../../lib/notes-import-limits.ts";

/** At most this many files per request, the same order as the notes import's queue. */
export const MAX_UPLOAD_FILES = 20;
const MAX_NAME_LENGTH = 120;

/** The saved file's name: the browser's basename with separators, control
 * characters and leading dots removed, so it can never leave its directory
 * or hide itself. Persian and other scripts stay as they are. */
export function safeUploadName(name: string): string {
	const base = name.split(/[\\/]/).pop() ?? "";
	const cleaned = base.replace(/[\x00-\x1f\x7f]/g, "").replace(/^\.+/, "").trim();
	if (!cleaned) return "file";
	if (cleaned.length <= MAX_NAME_LENGTH) return cleaned;
	const ext = path.extname(cleaned).slice(0, 16);
	return cleaned.slice(0, MAX_NAME_LENGTH - ext.length) + ext;
}

class UploadBodyLimitError extends Error {}

async function readBoundedForm(request: Request): Promise<FormData> {
	if (Number(request.headers.get("content-length")) > MAX_IMPORT_BODY_BYTES) {
		void request.body?.cancel().catch(() => undefined);
		throw new UploadBodyLimitError();
	}
	const reader = request.body?.getReader();
	if (!reader) throw new SyntaxError("Missing upload body");
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > MAX_IMPORT_BODY_BYTES) throw new UploadBodyLimitError();
			chunks.push(value);
		}
	} finally {
		void reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
	const body = new Uint8Array(bytes);
	let offset = 0;
	for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
	return await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}

/** POST /api/uploads: multipart field "files" → `{ paths }`, in request order.
 * 404 outside hosted mode, where attachments stay local paths. */
export async function uploadsResponse(request: Request, hosted = HOSTED, dir = UPLOADS_DIR): Promise<Response> {
	if (!hosted) return Response.json({ error: "not found" }, { status: 404 });
	let form: FormData;
	try { form = await readBoundedForm(request); }
	catch (err) {
		const oversized = err instanceof UploadBodyLimitError;
		return Response.json({ error: oversized ? "too_large" : "unreadable" }, { status: oversized ? 413 : 400 });
	}
	const files = form.getAll("files").filter((f): f is File => f instanceof File);
	if (files.length === 0) return Response.json({ error: "no_files" }, { status: 400 });
	if (files.length > MAX_UPLOAD_FILES) return Response.json({ error: "too_many" }, { status: 413 });
	if (files.reduce((total, file) => total + file.size, 0) > MAX_IMPORT_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
	const paths: string[] = [];
	for (const file of files) {
		const folder = path.join(dir, nanoid(10));
		fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
		const target = path.join(folder, safeUploadName(file.name));
		fs.writeFileSync(target, new Uint8Array(await file.arrayBuffer()), { mode: 0o600, flag: "wx" });
		paths.push(target);
	}
	return Response.json({ paths });
}
