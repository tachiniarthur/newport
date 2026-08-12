import type { Dictionary } from "./pt";

export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Portuguese is the default; English exists for international roles. */
export const DEFAULT_LOCALE: Locale = "pt";

/** BCP 47 tags, for `<html lang>`, `Intl` and hreflang alternates. */
export const LOCALE_TAGS: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
};

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  pt: () => import("./pt").then((m) => m.default),
  en: () => import("./en").then((m) => m.default),
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

export type { Dictionary };
