/**
 * Real people who recommended Arthur, in their own words.
 *
 * IMPORTANT — READ BEFORE EDITING:
 * `quote` is verbatim, copied from each person's LinkedIn recommendation, and
 * that is the whole point of this file. Do not tidy it. The originals contain a
 * repeated word and two misspellings; they are somebody else's sentences and
 * they stay as written. Nothing here is ever paraphrased, shortened or
 * translated — a recommendation is a named person vouching for Arthur, and the
 * moment the words are not theirs it is not one.
 *
 * That includes the English build. Both locales render these in the original
 * Portuguese; the English dictionary carries a note saying so
 * (`testimonials.note`) rather than a translation of anybody's words.
 *
 * Paragraphs are an array because two of them have more than one, and the
 * breaks are the author's.
 *
 * OUTSTANDING DATA — do not invent, ask Arthur:
 *   FALTA: LinkedIn profile URL for all five people
 */

export type Testimonial = {
  id: string;
  name: string;
  /** null until supplied — the name renders unlinked rather than pointing nowhere. */
  href: string | null;
  /** BCP 47 tag of the words below, so the markup says what language they are
   *  in even on the English page. */
  lang: string;
  /** Verbatim recommendation, one entry per paragraph. Never write one here. */
  quote: readonly string[];
};

/** Most recent first. */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "matheus-hagedorn",
    name: "Matheus Hagedorn",
    href: null, // FALTA
    lang: "pt-BR",
    quote: [
      "Tive o prazer de cursar Engenharia de Software com o Tachini, nos formamos juntos em 2026, e fizemos vários trabalhos em grupo ao longo da graduação. Ao longo desse período, pude ver de perto a versatilidade dele: é um profissional completo, com domínio técnico sólido, seja em programação, arquitetura de sistemas ou banco de dados, e, ao mesmo tempo, com qualidades comportamentais que fazem toda a diferença em equipe, como liderança natural, calma sob pressão e criatividade para resolver problemas.",
      "Mais do que isso, o Tachini sempre foi um parceiro de verdade. Em cada projeto que fizemos juntos, ele demonstrou comprometimento, disposição para ajudar os colegas e uma postura colaborativa que tornava o trabalho em grupo mais leve e produtivo. É o tipo de pessoa que você quer ter no time, tanto pela capacidade técnica quanto pelo caráter.",
      "Recomendo o Tachini sem hesitar para qualquer oportunidade que exija excelência técnica aliada a um espírito de equipe genuíno.",
    ],
  },
  {
    id: "giordano-gava",
    name: "Giordano Gava",
    href: null, // FALTA
    lang: "pt-BR",
    // "Além de de ser" está assim no original. Não corrigir sem falar com ele.
    quote: [
      "Estudo com o Arthur na faculdade, e já fizemos alguns trabalhos em grupo. Ele demonstrou um vasto conhecimento em programação, principalmente nas linguagens Vue.js e Laravel. Além de de ser uma pessoa muito focada e trabalhar muito bem em equipe.",
    ],
  },
  {
    id: "walter-coan",
    name: "Walter Coan",
    href: null, // FALTA
    lang: "pt-BR",
    // "regulamente" está assim no original.
    quote: [
      "Fui professor do Arthur na disciplina de Fábrica de Software em 2024 onde ele foi capaz de desenvolver um sistema de informação Web para o gerenciamento de eventos direcionado para pessoas que gostam de carros esportivos. A aplicação foi desenvolvida utilizando o framework Vue.js e uma API Rest com o Spring Boot. Além disso, Arthur participa regulamente dos grupos de estudo para preparação para as provas de certificação Azure Fundamentals (AZ-900) e AWS Cloud Practitioner.",
    ],
  },
  {
    id: "thiago-rodrigues",
    name: "Thiago Rodrigues",
    href: null, // FALTA
    lang: "pt-BR",
    // "contrução" está assim no original.
    quote: [
      "Trabalhei com o Arthur em alguns projetos, e com certeza pude aprender muito com ele, é um profissional muito dedicado, que busca aprender algo novo em cada projeto. Seu conhecimento em Laravel e Vue auxiliaram para a contrução de páginas e funcionalidades complexas.",
      "Para quem busca um profissional dedicado e talentoso, então com certeza está em busca do Arthur.",
    ],
  },
  {
    id: "matheus-bittencourt",
    name: "Matheus Bittencourt",
    href: null, // FALTA
    lang: "pt-BR",
    quote: [
      "Tive a oportunidade de colaborar com o Arthur em diversos projetos e posso afirmar que aprendi bastante com ele. Ele é um profissional extremamente dedicado, sempre buscando adquirir novos conhecimentos em cada tarefa. Seu domínio de Laravel e Vue foi fundamental para o desenvolvimento de aplicações web e funcionalidades complexas em páginas específicas. Se você está procurando um profissional comprometido e talentoso, o Arthur é, sem dúvida, a pessoa certa.",
    ],
  },
] as const;
