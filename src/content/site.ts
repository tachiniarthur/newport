/**
 * Facts that do not change with language: names, URLs, years.
 * Translated prose lives in `src/content/dictionaries/`.
 */

export const SITE_URL = "https://arthurtachini.dev";

export const IDENTITY = {
  fullName: "Arthur Henrique Tachini",
  /** Split for the hero, which reveals one line at a time. */
  nameLines: ["Arthur", "Henrique", "Tachini"] as const,
  shortName: "Tachini",
  email: "arthurtachini.dev@gmail.com",
  city: "Joinville",
  region: "Santa Catarina",
  regionCode: "SC",
  country: "Brasil",
  countryCode: "BR",
  timeZone: "America/Sao_Paulo",
} as const;

export const SOCIALS = [
  { key: "github", label: "GitHub", handle: "@tachiniarthur", href: "https://github.com/tachiniarthur" },
  { key: "linkedin", label: "LinkedIn", handle: "in/arthurtachini", href: "https://linkedin.com/in/arthurtachini" },
  { key: "instagram", label: "Instagram", handle: "@tachiini_", href: "https://instagram.com/tachiini_" },
] as const;

/** First professional year. Experience is derived from this so it never ages. */
export const CAREER_START_YEAR = 2022;

/** First year on the share card's ruler — the Senai técnico. */
export const RULER_START_YEAR = 2020;

export function yearsOfExperience(now: Date = new Date()): number {
  return now.getFullYear() - CAREER_START_YEAR;
}

export function currentYear(now: Date = new Date()): number {
  return now.getFullYear();
}

/** Inclusive span of years the share card's ruler draws. */
export function rulerYears(now: Date = new Date()): number[] {
  const end = Math.max(currentYear(now), RULER_START_YEAR);
  return Array.from({ length: end - RULER_START_YEAR + 1 }, (_, i) => RULER_START_YEAR + i);
}
