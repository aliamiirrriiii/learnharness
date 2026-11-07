/** Hosted mode in the browser (teeez fork): baked in at build time by
 * NEXT_PUBLIC_LH_HOSTED=1, the client twin of config.ts HOSTED. */
export const HOSTED_UI = process.env.NEXT_PUBLIC_LH_HOSTED === "1";

export type UploadOutcome = { ok: true; paths: string[] } | { ok: false; error: "too_large" | "too_many" | "failed" };

/** Upload picked or dropped files (POST /api/uploads) and return the paths
 * they were saved at, for the composer to insert like desktop paths. */
export async function uploadFiles(files: File[], fetcher: typeof fetch = fetch): Promise<UploadOutcome> {
	const form = new FormData();
	for (const file of files) form.append("files", file, file.name);
	try {
		const response = await fetcher("/api/uploads", { method: "POST", body: form });
		const body = await response.json().catch(() => ({})) as { paths?: unknown; error?: unknown };
		if (response.ok && Array.isArray(body.paths) && body.paths.every((p) => typeof p === "string")) return { ok: true, paths: body.paths };
		return { ok: false, error: body.error === "too_large" || body.error === "too_many" ? body.error : "failed" };
	} catch {
		return { ok: false, error: "failed" };
	}
}
