/**
 * UI language (teeez fork). The English source string IS the key: wrap a
 * user-visible literal as t("Attach files") and give its Persian in
 * lib/i18n/fa/. A string with no entry shows in English, and
 * tests/i18n-coverage.test.ts fails on it, so a missed one is caught before
 * a build, not by a person. NEXT_PUBLIC_LH_LOCALE=fa selects Persian and
 * right-to-left; unset, the app is upstream's English, byte for byte.
 *
 * Placeholders are {name}; a number placed through one is written in the
 * locale's digits. Strings sent to a model (prompts, tool results) are
 * never wrapped: the teaching language is the prompt's business.
 */
import { FA } from "./fa/index.ts";

export type Locale = "en" | "fa";
export const LOCALE: Locale = process.env.NEXT_PUBLIC_LH_LOCALE === "fa" ? "fa" : "en";
export const DIR: "ltr" | "rtl" = LOCALE === "fa" ? "rtl" : "ltr";

type Vars = Record<string, string | number>;

export function formatNumber(n: number, options?: Intl.NumberFormatOptions, locale: Locale = LOCALE): string {
	return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", options).format(n);
}

/** Exported with the dictionary and locale as parameters for the tests. */
export function translate(source: string, vars: Vars | undefined, dict: Readonly<Record<string, string>>, locale: Locale): string {
	const template = dict[source] ?? source;
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = vars[name];
		if (value === undefined) return match;
		return typeof value === "number" ? formatNumber(value, undefined, locale) : value;
	});
}

const ACTIVE: Readonly<Record<string, string>> = LOCALE === "fa" ? FA : {};

export function t(source: string, vars?: Vars): string {
	return translate(source, vars, ACTIVE, LOCALE);
}

/** Count-dependent text: `plural(n, "{n} source", "{n} sources")`. Both
 * forms need an entry; Persian usually gives both the same text. */
export function plural(n: number, one: string, other: string, vars?: Vars): string {
	return t(n === 1 ? one : other, { n, ...vars });
}
