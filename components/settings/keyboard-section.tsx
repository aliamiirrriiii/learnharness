"use client";
/**
 * The Keyboard section (thin settings wave): view / rebind / reset over
 * core/keyboard.ts's registry. The overrides persist in localStorage
 * (lh:keymap, overrides-only, merged over DEFAULT_BINDINGS), so rebinding
 * is INSTANT — the dispatcher reads the map per keydown, no reload.
 *
 * Rebind flow: click Rebind → the row listens for the next keydown
 * (capture phase, preventDefault — nothing types anywhere), eventBinding
 * normalizes it, saveOverrides persists. Escape cancels. displayOnly
 * actions (a surface owns those keys — the question dock's row machine)
 * are listed for reading but never rebindable.
 *
 * Thin: no conflict detection — if a new binding collides with another
 * action's, the first match in registry order wins; the cheat sheet shows
 * both. Detection belongs to the designed wave.
 */

import { useEffect, useState } from "react";
import {
	KEYBOARD_ACTIONS,
	eventBinding,
	formatBinding,
	loadOverrides,
	saveOverrides,
	type KeyAction,
	type KeyActionDef,
	type KeyScope,
} from "@/src/core";
import { t } from "@/lib/i18n";
import { SettingsRow } from "./controls.tsx";

const SCOPES: { scope: KeyScope; label: string }[] = [
	{ scope: "global", label: t("Global") },
	{ scope: "chat", label: t("Chat") },
	{ scope: "graph", label: t("Graph") },
];

/** The registry's labels as shown (src/core/keyboard.ts keeps the English);
 *  shared with the cheat sheet. */
const ACTION_LABELS: Record<KeyAction, string> = {
	"toggle-dictation": t("Toggle dictation"),
	"open-settings": t("Open settings"),
	"open-model-picker": t("Model selector"),
	"cycle-thinking": t("Cycle thinking level"),
	"toggle-sidebar": t("Toggle sessions sidebar"),
	"sessions-search": t("Search sessions"),
	"jump-graph": t("Graph view"),
	"new-session": t("New session"),
	"rename-session": t("Rename session"),
	"toggle-user-thinking": t("Toggle all your thinking"),
	"find": t("Find"),
	"cheat-sheet": t("Shortcut cheat sheet"),
	"question-focus": t("Question · focus thinking ↔ rows"),
	"question-next-row": t("Question · next row"),
	"question-prev-row": t("Question · previous row"),
	"question-pick-row": t("Question · pick row"),
	"question-submit": t("Question · submit"),
};

export function actionLabel(def: KeyActionDef): string {
	return ACTION_LABELS[def.id] ?? def.label;
}

/** The overrides map after ONE change (pure — exported for tests):
 *  binding null = reset the action to its default (key removed). */
export function nextOverrides(
	current: Partial<Record<KeyAction, string>>,
	id: KeyAction,
	binding: string | null,
): Partial<Record<KeyAction, string>> {
	const next = { ...current };
	if (binding === null) delete next[id];
	else next[id] = binding;
	return next;
}

export function KeyboardSection() {
	const [overrides, setOverrides] = useState<Partial<Record<KeyAction, string>>>({});
	const [rebinding, setRebinding] = useState<KeyAction | null>(null);
	const [nonce, setNonce] = useState(0);

	// localStorage is read post-mount (SSR-safe); `nonce` re-reads after writes.
	useEffect(() => {
		setOverrides(loadOverrides());
	}, [nonce]);

	// The capture listener — only while a rebind is armed.
	useEffect(() => {
		if (!rebinding) return;
		const onKey = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.key === "Escape") {
				setRebinding(null);
				return;
			}
			// Modifier keydowns arrive one by one (⌘ down, then ⇧, then the
			// key) — each is a keydown this capture listener sees. They are
			// not bindings; keep listening for the real key.
			if (e.key === "Control" || e.key === "Meta" || e.key === "Alt" || e.key === "Shift") return;
			const binding = eventBinding(e);
			if (!binding) return;
			const next = nextOverrides(loadOverrides(), rebinding, binding);
			saveOverrides(next);
			setRebinding(null);
			setNonce((n) => n + 1);
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [rebinding]);

	function resetOne(id: KeyAction) {
		saveOverrides(nextOverrides(loadOverrides(), id, null));
		setNonce((n) => n + 1);
	}

	function resetAll() {
		saveOverrides({});
		setNonce((n) => n + 1);
	}

	const overridden = (id: KeyAction) => overrides[id] !== undefined;

	return (
		<>
			{SCOPES.map(({ scope, label }) => {
				const actions = KEYBOARD_ACTIONS.filter((a) => a.scope === scope);
				if (!actions.length) return null;
				return (
					<div key={scope} data-testid={`kbd-scope-${scope}`}>
						<p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground/70">{label}</p>
						<div className="flex flex-col gap-2">
							{actions.map((def) => {
								const effective = overrides[def.id] ?? def.binding;
								return (
									<SettingsRow
										key={def.id}
										label={actionLabel(def)}
										hint={def.displayOnly ? t("Fixed — part of this screen") : undefined}
										testid={`kbd-row-${def.id}`}
									>
										<span className="flex items-center gap-2">
											<kbd dir={rebinding === def.id ? undefined : "ltr"} className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-ui text-xs">
												{rebinding === def.id ? t("Press keys…") : formatBinding(effective)}
											</kbd>
											{def.displayOnly ? null : rebinding === def.id ? (
												<button
													type="button"
													onClick={() => setRebinding(null)}
													className="text-xs text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
												>
													{t("Cancel")}
												</button>
											) : (
												<>
													<button
														type="button"
														onClick={() => setRebinding(def.id)}
														data-testid={`kbd-rebind-${def.id}`}
														className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
													>
														{t("Rebind")}
													</button>
													{overridden(def.id) && (
														<button
															type="button"
															onClick={() => resetOne(def.id)}
															data-testid={`kbd-reset-${def.id}`}
															className="text-xs text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
														>
															{t("Reset")}
														</button>
													)}
												</>
											)}
										</span>
									</SettingsRow>
								);
							})}
						</div>
					</div>
				);
			})}
			<div className="mt-1 flex items-center justify-between">
				<span className="text-xs text-muted-foreground/70">{t("Stored on this device (lh:keymap) — overrides only.")}</span>
				<button
					type="button"
					onClick={resetAll}
					data-testid="kbd-reset-all"
					className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
				>
					{t("Reset all to defaults")}
				</button>
			</div>
		</>
	);
}