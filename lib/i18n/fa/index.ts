/** Persian for every t()/plural() source string, split by area so each
 * part can be edited on its own. Later parts win on a duplicate key; the
 * coverage test reports duplicates whose Persian differs. */
import { CHAT } from "./chat.ts";
import { GRAPH } from "./graph.ts";
import { SETTINGS } from "./settings.ts";
import { SHELL } from "./shell.ts";

export const FA_PARTS = { CHAT, GRAPH, SETTINGS, SHELL } as const;
export const FA: Readonly<Record<string, string>> = { ...SHELL, ...SETTINGS, ...GRAPH, ...CHAT };
