/**
 * The real career timeline. It drives the trajectory section and the two-lane
 * graphic on the share card.
 *
 * An entry is a *place*, not a post. That distinction is the whole shape of
 * this file: Arthur was at FACE Digital twice over — trainee, then full stack
 * junior — and at Univille for a degree and then a thesis, and a list of posts
 * renders each of those as two separate organisations arriving at two separate
 * points in his life, which is not what happened. So the posts are nested
 * inside the place that held them, and a place appears exactly once.
 *
 * `track` is what makes the share-card graphic carry information rather than
 * decoration — education and work ran in parallel from 2022 to 2026, and the
 * two lanes show that without a sentence of copy.
 *
 * Every `id` under `roles` is a key in `timeline.items` in both dictionaries.
 * The organisation names are not translated; they are proper nouns.
 */

export type Track = "education" | "work";

/** A post held at one organisation. `endYear: null` means "still going". */
export type Role = {
  id: string;
  startYear: number;
  endYear: number | null;
  /** Stack actually used. Empty array renders nothing. */
  tech: readonly string[];
};

export type Milestone = {
  id: string;
  track: Track;
  organization: string;
  /** Oldest first, so the entry reads as a progression: the promotion at FACE
   *  is the point of holding two posts under one heading. */
  roles: readonly Role[];
  /** Derived from `roles` — see `place`. Never written by hand, so the span in
   *  the margin can never disagree with the posts beside it. */
  startYear: number;
  endYear: number | null;
};

function place(
  id: string,
  track: Track,
  organization: string,
  roles: readonly Role[],
): Milestone {
  const startYear = roles.reduce((min, role) => Math.min(min, role.startYear), Infinity);
  const ongoing = roles.some((role) => role.endYear === null);
  const endYear = ongoing
    ? null
    : roles.reduce((max, role) => Math.max(max, role.endYear ?? max), -Infinity);

  return { id, track, organization, roles, startYear, endYear };
}

const PLACES: readonly Milestone[] = [
  place("senai", "education", "Senai Joinville Norte", [
    { id: "senai", startYear: 2020, endYear: 2021, tech: [] },
  ]),

  place("face", "work", "FACE Digital", [
    {
      id: "face-trainee",
      startYear: 2022,
      endYear: 2024,
      tech: ["PHP", "Laravel", "HTML", "CSS", "Sass", "Bootstrap", "JavaScript", "Docker"],
    },
    {
      id: "face-junior",
      startYear: 2024,
      endYear: 2024,
      tech: ["Laravel", "SOLID", "DDD", "Vue", "MongoDB", "Oracle", "Docker"],
    },
  ]),

  place("univille", "education", "Univille", [
    { id: "univille", startYear: 2022, endYear: 2026, tech: [] },
    { id: "tcc", startYear: 2026, endYear: 2026, tech: ["Testes unitários", "IA"] },
  ]),

  place("softexpert", "work", "SoftExpert", [
    {
      id: "softexpert-php",
      startYear: 2024,
      endYear: 2025,
      tech: ["PHP", "SQL", "Oracle", "PostgreSQL", "MySQL", "JasperReports"],
    },
    {
      id: "softexpert-aps",
      startYear: 2025,
      endYear: null,
      tech: [
        "PHP",
        "Java",
        "React",
        "SQL",
        "Oracle",
        "PostgreSQL",
        "MySQL",
        "Testes automatizados",
      ],
    },
  ]),
];

/**
 * In document order: by the year each place was *finished*, with anything still
 * running last.
 *
 * By start year instead, the degree lands in 2022 — in the middle of the first
 * job, four years before there was a diploma to show for it — and the reader
 * has to hold an open bracket in their head for the rest of the section. What
 * finished when is the thing a timeline is actually being read for.
 */
const finishedAt = (m: Milestone) => m.endYear ?? Number.POSITIVE_INFINITY;

export const TIMELINE: readonly Milestone[] = [...PLACES].sort(
  (a, b) => finishedAt(a) - finishedAt(b) || a.startYear - b.startYear,
);

/**
 * A span as it is printed: a single year when it opened and closed in one,
 * and an open end when it has not closed.
 */
export function formatSpan(
  startYear: number,
  endYear: number | null,
  present: string,
): string {
  // An en dash, and never an em dash: the em is the mark Arthur does not want
  // anywhere on the page, and a range is what the en is for.
  if (endYear === null) return `${startYear} – ${present}`;
  if (endYear === startYear) return String(startYear);
  return `${startYear} – ${endYear}`;
}

/** Years in which a given track was active — the filled segments of the ruler. */
export function activeYears(track: Track, upToYear: number): Set<number> {
  const years = new Set<number>();
  for (const m of TIMELINE) {
    if (m.track !== track) continue;
    const end = m.endYear ?? upToYear;
    for (let y = m.startYear; y <= Math.min(end, upToYear); y++) years.add(y);
  }
  return years;
}
