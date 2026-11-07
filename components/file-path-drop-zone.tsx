"use client";

import { useEffect, useRef, useState } from "react";
import { FileSymlinkIcon, XIcon } from "lucide-react";
import { directoryReferencePath, quoteFilePath } from "@/src/core";
import { appendToPrimaryInput } from "@/components/dictation";
import { INSERT_FILE_PATHS_EVENT } from "@/components/path-input";
import { HOSTED_UI, uploadFiles, type UploadOutcome } from "@/lib/hosted";

export const BROWSER_NOTICE = "Local file paths can only be attached in the desktop app. You can paste a full path instead.";

/** Hosted mode: what a failed upload tells the person. */
export function uploadNotice(error: Extract<UploadOutcome, { ok: false }>["error"]): string {
	if (error === "too_large") return "Too big. Max 25 MB per upload.";
	if (error === "too_many") return "Too many files. Attach up to 20 at a time.";
	return "Could not upload. Try again.";
}

/** Insert paths into the focused path input inside `zone`, else the open chat's composer. */
function insertPaths(zone: HTMLElement, paths: string[]): boolean {
	const focused = document.activeElement?.closest<HTMLElement>("[data-file-path-input]");
	if (focused && zone.contains(focused)) {
		focused.dispatchEvent(new CustomEvent(INSERT_FILE_PATHS_EVENT, { detail: paths }));
		return true;
	}
	return appendToPrimaryInput(paths.map(quoteFilePath).join(" "));
}

/** The content area only: the sidebar is deliberately outside this zone.
 * Existing files stay where they are; only quoted path strings enter drafts. */
export function FilePathDropZone({ children, className }: { children: React.ReactNode; className?: string }) {
	const root = useRef<HTMLElement>(null);
	const depth = useRef(0);
	const [dragging, setDragging] = useState(false);
	const [notice, setNotice] = useState("");
	const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files");
	const clearDrag = () => { depth.current = 0; setDragging(false); };
	useEffect(() => {
		// The sidebar remains a non-target, but dropping a file there must not
		// navigate the app away. No indicator or attachment is produced there.
		const preventOutsideNavigation = (event: DragEvent) => {
			if (Array.from(event.dataTransfer?.types ?? []).includes("Files")
				&& event.target instanceof Node && !root.current?.contains(event.target)) event.preventDefault();
		};
		window.addEventListener("dragover", preventOutsideNavigation);
		window.addEventListener("drop", preventOutsideNavigation);
		return () => {
			window.removeEventListener("dragover", preventOutsideNavigation);
			window.removeEventListener("drop", preventOutsideNavigation);
		};
	}, []);
	return (
		<main
			ref={root}
			className={className}
			data-testid="file-path-drop-zone"
			onDragEnter={(event) => {
				if (!hasFiles(event)) return;
				event.preventDefault();
				depth.current++;
				setDragging(true);
				setNotice("");
			}}
			onDragOver={(event) => {
				if (!hasFiles(event)) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = "copy";
			}}
			onDragLeave={(event) => {
				if (!hasFiles(event)) return;
				depth.current = Math.max(0, depth.current - 1);
				if (depth.current === 0) setDragging(false);
			}}
			onDragEnd={clearDrag}
			onDrop={(event) => {
				if (!hasFiles(event)) return;
				event.preventDefault();
				event.stopPropagation();
				clearDrag();
				if (HOSTED_UI) {
					const zone = event.currentTarget;
					// Folders have no bytes to upload; only plain files go up.
					const entries = Array.from(event.dataTransfer.items).filter((item) => item.kind === "file");
					const files = Array.from(event.dataTransfer.files).filter((_, index) => {
						try { return entries[index]?.webkitGetAsEntry?.()?.isDirectory !== true; } catch { return true; }
					});
					if (files.length === 0) { setNotice("Drop files, not folders."); return; }
					void uploadFiles(files).then((outcome) => {
						if (!outcome.ok) { setNotice(uploadNotice(outcome.error)); return; }
						setNotice(insertPaths(zone, outcome.paths) ? "" : "Open a chat to attach files.");
					});
					return;
				}
				const resolve = window.lh?.getPathForFile;
				if (!resolve) { setNotice(BROWSER_NOTICE); return; }
				// Inspect only the dropped item's type, never traverse its entries.
				// Positively known directories get a durable trailing separator.
				const entries = Array.from(event.dataTransfer.items).filter((item) => item.kind === "file");
				const paths: string[] = [];
				let skipped = 0;
				for (const [index, file] of Array.from(event.dataTransfer.files).entries()) {
					try {
						let directory = false;
						try { directory = entries[index]?.webkitGetAsEntry?.()?.isDirectory === true; }
						catch { /* Unknown type stays unmarked, not guessed. */ }
						const original = resolve(file);
						const path = directory ? directoryReferencePath(original) : original;
						quoteFilePath(path); // Same rooted-path validity rule as typed chips.
						paths.push(path);
					} catch { skipped++; }
				}
				if (paths.length === 0) {
					setNotice("No local file paths were available. Drop existing files or folders from your computer.");
					return;
				}
				if (!insertPaths(event.currentTarget, paths)) {
					setNotice("Open a chat to attach file paths.");
					return;
				}
				setNotice(skipped ? "Some dropped items had no available file path." : "");
			}}
		>
			{children}
			{dragging && (
				<div data-testid="file-path-drop-indicator" className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/85 p-6 text-center backdrop-blur-sm">
					<div className="flex max-w-md flex-col items-center gap-3">
						<FileSymlinkIcon className="size-8 text-primary" aria-hidden />
						<span className="font-ui text-sm">{HOSTED_UI ? "Drop to attach files" : window.lh?.getPathForFile ? "Drop to attach file paths" : BROWSER_NOTICE}</span>
					</div>
				</div>
			)}
			{notice && <div role="status" className="absolute bottom-2 left-1/2 z-50 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-md border bg-card px-3 py-2 font-ui text-xs shadow-sm">
				<span>{notice}</span>
				<button type="button" aria-label="Dismiss attachment notice" onClick={() => setNotice("")} className="shrink-0 rounded-sm p-1 hover:bg-accent"><XIcon className="size-3" aria-hidden /></button>
			</div>}
		</main>
	);
}
