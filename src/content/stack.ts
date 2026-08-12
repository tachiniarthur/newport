/**
 * Technical stack, grouped by layer — deliberately a typographic list, not a
 * grid of logos. Hovering a row reveals `where`: the real place the technology
 * was used. That note is the whole point of the section; a row with nothing
 * honest to say in it does not belong here.
 *
 * `where` answers with places, never with projects. There are three of them and
 * there is no fourth: the two employers, and everything else rolled up as
 * "personal projects". Naming the projects here was the section saying twice
 * what the projects section already says once, and it made the longest rows a
 * list of five things nobody was reading to the end of. The union type is what
 * keeps it that way — a row cannot name a project, because there is nothing to
 * write it in.
 *
 * Group titles are translated, keyed by `id` in the dictionaries.
 */

import type { IconName } from "./icons";

/** The three answers. See the note above on why there is no fourth. */
export type Place = "softexpert" | "face" | "personal";

/**
 * How the two employers are written. They are proper nouns, so they live here
 * rather than in the dictionaries — there is nothing to translate. "personal"
 * is the one that is prose, and it comes from `dict.stack.places`.
 */
export const EMPLOYER: Record<Exclude<Place, "personal">, string> = {
  softexpert: "SoftExpert",
  face: "FACE Digital",
};

export type StackItem = {
  name: string;
  /** The mark drawn beside the name. See src/content/icons.ts — the type is
   *  what stops a new row being added without one. */
  icon: IconName;
  /** `null` renders the row without a note, rather than with an invented one. */
  where: readonly Place[] | null;
};

export type StackGroup = {
  id: "languages" | "backend" | "frontend" | "data" | "infra" | "quality";
  items: readonly StackItem[];
};

export const STACK: readonly StackGroup[] = [
  {
    id: "languages",
    items: [
      { name: "PHP", icon: "php", where: ["softexpert", "face", "personal"] },
      { name: "Java", icon: "openjdk", where: ["softexpert", "personal"] },
      { name: "JavaScript", icon: "javascript", where: ["softexpert", "face", "personal"] },
      { name: "TypeScript", icon: "typescript", where: ["softexpert", "personal"] },
      { name: "Python", icon: "python", where: ["personal"] },
    ],
  },
  {
    id: "backend",
    items: [
      { name: "Laravel", icon: "laravel", where: ["face", "personal"] },
      { name: "Spring Boot", icon: "springboot", where: ["personal"] },
      { name: "FastAPI", icon: "fastapi", where: ["personal"] },
      { name: "Inertia", icon: "inertia", where: ["face", "personal"] },
      { name: "CodeIgniter", icon: "codeigniter", where: ["face"] },
    ],
  },
  {
    id: "frontend",
    items: [
      { name: "Vue", icon: "vue", where: ["face", "personal"] },
      { name: "React", icon: "react", where: ["softexpert"] },
      { name: "Next", icon: "next", where: ["personal"] },
      { name: "Tailwind", icon: "tailwind", where: ["face", "personal"] },
      { name: "Sass", icon: "sass", where: ["face", "personal"] },
      { name: "Bootstrap", icon: "bootstrap", where: ["face", "personal"] },
      { name: "jQuery", icon: "jquery", where: ["face"] },
    ],
  },
  {
    id: "data",
    items: [
      { name: "SQL", icon: "database", where: ["softexpert", "face", "personal"] },
      { name: "Oracle", icon: "database", where: ["softexpert", "face"] },
      { name: "PostgreSQL", icon: "database", where: ["softexpert", "personal"] },
      { name: "MongoDB", icon: "mongodb", where: ["face"] },
      { name: "MySQL", icon: "mysql", where: ["softexpert", "face"] },
      { name: "MariaDB", icon: "mariadb", where: ["face"] },
    ],
  },
  {
    id: "infra",
    items: [
      { name: "Docker", icon: "docker", where: ["face"] },
      { name: "Jenkins", icon: "jenkins", where: ["softexpert"] },
      { name: "Datadog", icon: "datadog", where: ["softexpert"] },
      { name: "Git", icon: "git", where: ["softexpert", "face", "personal"] },
      { name: "GitHub", icon: "github", where: ["personal"] },
      { name: "GitLab", icon: "gitlab", where: ["softexpert", "face"] },
      { name: "Bitbucket", icon: "bitbucket", where: ["face"] },
    ],
  },
  {
    id: "quality",
    items: [
      { name: "Testes automatizados", icon: "check", where: ["softexpert", "personal"] },
      { name: "PHPUnit", icon: "check", where: ["softexpert"] },
      { name: "JUnit", icon: "junit", where: ["softexpert"] },
      { name: "TestNG", icon: "check", where: ["softexpert"] },
      { name: "Selenium WebDriver", icon: "selenium", where: ["softexpert"] },
    ],
  },
] as const;
