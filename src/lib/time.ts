import { IDENTITY } from "@/content/site";
import { LOCALE_TAGS, type Locale } from "@/content/dictionaries";

/**
 * Joinville wall-clock time. Formatted through `Intl` with an explicit time
 * zone so it is correct regardless of where the visitor is, and regardless of
 * whether the render happened on the server or in the browser.
 *
 * The clock reads in the convention of whoever is reading it: 24-hour in
 * Portuguese, 12-hour with AM/PM in English. It is still Joinville's wall
 * clock either way — only the notation changes.
 *
 * `hour: "2-digit"` matters more in the 12-hour branch than in the other one:
 * it keeps a padding zero on single-digit hours, so the line is the same width
 * at 3pm as at 11pm and the header does not shift a pixel every hour.
 */
export function formatLocalTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    timeZone: IDENTITY.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: locale === "en",
  }).format(date);
}

/** Short offset label, e.g. "GMT-3". Shown once, next to the clock. */
export function timeZoneLabel(date: Date, locale: Locale): string {
  const parts = new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    timeZone: IDENTITY.timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}
