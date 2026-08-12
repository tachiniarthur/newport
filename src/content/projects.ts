/**
 * Projects.
 *
 * To add one: append an entry here, then add a matching key under
 * `projects.items` in BOTH dictionaries (pt.ts and en.ts). The `id` is the
 * contract between the two files — a missing translation is a type error.
 *
 * The featured one is first in the array and carries `featured` — the flag is
 * what decides it, the order is only so the file reads the way the page does.
 *
 * OUTSTANDING DATA — do not invent, ask Arthur:
 *   FALTA: year for every project below (left null, the list renders "—")
 *   FALTA: exact stack for `miranda`, and the rest of `i-love-my-duck`'s
 *   FALTA: a live demo URL for every project other than `i-love-my-duck`
 *   FALTA: a thumbnail image per project (see `thumbnail`)
 */

export type ProjectLink = {
  kind: "repo" | "demo";
  /** Shown in mono next to the link when a project has more than one repo. */
  label?: string;
  href: string;
};

export type Project = {
  id: string;
  title: string;
  /** null until Arthur confirms — rendered as an em dash, never guessed. */
  year: number | null;
  tech: readonly string[];
  links: readonly ProjectLink[];
  /**
   * FALTA: real screenshots. Path under /public once supplied. Until then the
   * thumbnail slot renders a labelled 1px-framed placeholder rather than a
   * stock image.
   */
  thumbnail: { src: string; width: number; height: number } | null;
  featured?: boolean;
};

export const PROJECTS: readonly Project[] = [
  {
    id: "i-love-my-duck",
    title: "I Love My Duck",
    year: null,
    // Next.js é o único item confirmado, e foi confirmado no próprio deploy
    // (o app serve /_next/…). O resto da stack continua FALTA — o que se sabe
    // além disso é que o processamento acontece inteiramente no navegador.
    tech: ["Next.js"],
    links: [{ kind: "demo", href: "https://ilovemyduck.vercel.app/" }],
    thumbnail: null,
    featured: true,
  },
  {
    id: "patos-digitais",
    title: "Patos Digitais",
    year: null,
    tech: ["Laravel", "Vue", "Inertia", "Tailwind"],
    links: [{ kind: "repo", href: "https://github.com/tachiniarthur/patos-digitais" }],
    thumbnail: null,
  },
  {
    id: "o-patusco",
    title: "O Patusco",
    year: null,
    tech: ["Laravel", "Vue", "Inertia", "Tailwind"],
    links: [{ kind: "repo", href: "https://github.com/tachiniarthur/o-patusco" }],
    thumbnail: null,
  },
  {
    id: "autostock-manager",
    title: "Autostock Manager",
    year: null,
    tech: ["Vue", "JavaScript", "Bootstrap", "Sass", "Java", "Spring Boot"],
    links: [
      { kind: "repo", label: "front", href: "https://github.com/tachiniarthur/front-autostockmanager" },
      { kind: "repo", label: "api", href: "https://github.com/tachiniarthur/api-autostockmanager" },
    ],
    thumbnail: null,
  },
  {
    id: "semente-solidaria",
    title: "Semente Solidária",
    year: null,
    tech: ["Java", "Vaadin"],
    links: [{ kind: "repo", href: "https://github.com/tachiniarthur/projeto-semente-solidaria" }],
    thumbnail: null,
  },
  {
    id: "miranda",
    title: "Miranda",
    year: null,
    // FALTA: stack real do Miranda.
    tech: [],
    links: [],
    thumbnail: null,
  },
] as const;

export const FEATURED_PROJECT = PROJECTS.find((p) => p.featured) ?? PROJECTS[0];
export const LISTED_PROJECTS = PROJECTS.filter((p) => !p.featured);
