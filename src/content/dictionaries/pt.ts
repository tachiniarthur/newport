/**
 * Portuguese dictionary. This is the source of truth for the shape of all
 * copy — `en.ts` is typed as `typeof pt`, so adding a key here without
 * translating it there is a compile error.
 *
 * Keys under `timeline.items`, `stack.groups`, `projects.items` and
 * `testimonials.people` mirror the `id` fields in the sibling data files.
 */

const pt = {
  meta: {
    title: "Arthur Henrique Tachini · Engenheiro de Software",
    description:
      "Engenheiro de Software em Joinville, SC. PHP e Laravel no back-end, Vue e React no front. Aplicações web de ponta a ponta e landing pages.",
    ogRole: "Engenheiro de Software",
  },

  nav: {
    skipToContent: "Pular para o conteúdo",
    languageLabel: "Idioma",
    themeLabel: "Alternar entre tema claro e escuro",
    cableLabel: "Seções da página",
    sections: {
      about: "Sobre",
      stack: "Stack",
      timeline: "Trajetória",
      projects: "Projetos",
      testimonials: "Recomendações",
      contact: "Contato",
    },
  },

  hero: {
    role: "Engenheiro de Software",
    location: "Joinville · BR",
    lede: "Construo aplicações web de ponta a ponta: PHP e Laravel no back-end, Vue e React no front. No expediente isso é software de gestão empresarial na SoftExpert. Fora dele, é landing page e presença digital para quem precisa existir bem na internet.",
    clockLabel: "Hora local",
    photoAlt: "Arthur Henrique Tachini, de óculos e suéter preto, olhando para fora do quadro",
    scrollHint: "Role",
  },

  about: {
    eyebrow: "Sobre",
    title: "Como eu trabalho",
    paragraphs: [
      "Comecei no técnico do Senai em 2020 e entrei no mercado em 2022, na FACE Digital, onde passei de trainee a full stack júnior trabalhando em projetos Laravel com SOLID e DDD, Vue no front, MongoDB e Oracle nos dados. Também ajudei a formar os desenvolvedores que chegaram depois de mim.",
      "Desde 2024 sou Engenheiro de Software na SoftExpert. Comecei no time OnDemand, construindo aplicações externas em PHP que customizavam a suíte da empresa e escrevendo as consultas SQL por trás delas. Hoje estou no APS — Archival, Protocol e Storeroom, componentes centrais da SoftExpert Suite —, onde liderei a implementação da infraestrutura de testes automatizados do time.",
      "Esse último ponto virou meu trabalho de conclusão de curso na Univille: uma comparação entre testes unitários escritos à mão e testes gerados por inteligência artificial.",
    ],
    meta: {
      sinceLabel: "Na área desde",
      experienceLabel: "Anos de experiência",
      cityLabel: "Base",
      cityValue: "Joinville, SC",
      degreeLabel: "Formação",
      degreeValue: "Engenharia de Software, Univille",
      languagesLabel: "Idiomas",
      languagesValue: "Português nativo · Inglês intermediário",
    },
  },

  stack: {
    eyebrow: "Stack",
    title: "Ferramentas, e onde elas foram usadas",
    hint: "Passe o mouse para ver onde cada uma foi usada de verdade.",
    hintTouch: "Toque para ver onde cada uma foi usada de verdade.",
    groups: {
      languages: "Linguagens",
      backend: "Back-end",
      frontend: "Front-end",
      data: "Dados",
      infra: "Infraestrutura",
      quality: "Qualidade",
    },
    // A única resposta de `where` que é texto, e não nome próprio. As duas
    // empresas estão em src/content/stack.ts.
    places: {
      personal: "Projetos pessoais",
    },
  },

  timeline: {
    eyebrow: "Trajetória",
    title: "De 2020 até aqui",
    present: "hoje",
    trackLabels: {
      education: "Formação",
      work: "Trabalho",
    },
    items: {
      senai: {
        role: "Técnico em Desenvolvimento de Sistemas",
        summary: "Formação técnica em desenvolvimento de sistemas.",
      },
      "face-trainee": {
        role: "Desenvolvedor Trainee",
        summary:
          "PHP e Laravel no dia a dia, Docker no ambiente. Apoiei a formação dos desenvolvedores que chegaram depois.",
      },
      univille: {
        role: "Engenharia de Software",
        summary: "Graduação concluída em julho de 2026.",
      },
      "face-junior": {
        role: "Desenvolvedor Full Stack Júnior",
        summary:
          "Projetos web de maior complexidade: Laravel aplicando SOLID e DDD, Vue no front, MongoDB e Oracle nos dados.",
      },
      "softexpert-php": {
        role: "Desenvolvedor PHP",
        summary:
          "No time OnDemand: aplicações externas em PHP para customização da suíte, e as consultas SQL por trás delas.",
      },
      "softexpert-aps": {
        role: "Engenheiro de Software I",
        summary:
          "No time do APS (Archival, Protocol e Storeroom), onde trabalhei como desenvolvedor full stack e liderei a infraestrutura de testes automatizados do time.",
      },
      tcc: {
        role: "Trabalho de conclusão de curso",
        summary:
          "Comparação entre testes unitários escritos manualmente e testes gerados por inteligência artificial.",
      },
    },
  },

  projects: {
    eyebrow: "Projetos",
    title: "O que eu construí",
    featuredLabel: "Em destaque",
    yearLabel: "Ano",
    roleLabel: "Papel",
    techLabel: "Stack",
    open: "Abrir",
    close: "Fechar",
    repo: "Repositório",
    demo: "Demonstração",
    items: {
      "patos-digitais": {
        role: "Autor",
        description:
          "Uma rede social feita para dar às pessoas um espaço livre de interação e troca de experiências.",
      },
      "o-patusco": {
        role: "Autor",
        description:
          "Plataforma de uma clínica veterinária, onde tutores cadastram seus pets e agendam consultas.",
      },
      "autostock-manager": {
        role: "Autor",
        description:
          "Plataforma de organização de venda de veículos, com múltiplos usuários e níveis de permissão. Front em Vue, API separada em Java com Spring Boot.",
      },
      "semente-solidaria": {
        role: "Autor",
        description:
          "Iniciativa comunitária de apoio a famílias em situação delicada, com controle de um depósito de doações.",
      },
      miranda: {
        role: "Autor",
        description:
          "Projeto pessoal: aplicativo com inteligência artificial para sugestão de looks diários.",
      },
      "i-love-my-duck": {
        role: "Autor",
        description:
          "Aplicação web que divide vídeos em partes para publicação em stories. O processamento acontece inteiramente no navegador.",
      },
    },
  },

  testimonials: {
    eyebrow: "Recomendações",
    title: "Quem trabalhou comigo",
    // As recomendações são citadas no original, em português. Aqui isso não
    // precisa ser dito; no dicionário em inglês, precisa.
    note: null as string | null,
    // Só a relação de cada pessoa com o Arthur. O que elas disseram está em
    // src/content/testimonials.ts, com as palavras delas.
    people: {
      "gabriel-gomes-rodrigues": { relation: "Colega de universidade" },
      "otavio-machado": { relation: "Colega de equipe" },
      "david-sidor": { relation: "Colega de trabalho" },
      "matheus-hagedorn": { relation: "Colega de universidade" },
      "giordano-gava": { relation: "Colega de universidade" },
      "walter-coan": { relation: "Professor na Univille" },
      "thiago-rodrigues": { relation: "Colega de trabalho" },
      "matheus-bittencourt": { relation: "Colega de trabalho" },
    },
  },

  contact: {
    eyebrow: "Contato",
    title: "Diga o que você precisa construir",
    lede: "Vaga, freelance ou uma conversa sem compromisso: os três chegam no mesmo lugar.",
    emailLabel: "E-mail",
    copy: "Copiar",
    copied: "Copiado",
    copyFailed: "Não deu para copiar. Selecione o endereço acima.",
    form: {
      name: "Nome",
      email: "E-mail",
      message: "Mensagem",
      submit: "Enviar",
      sending: "Enviando",
    },
    validation: {
      name: "Escreva seu nome.",
      email: "Esse e-mail não parece válido.",
      message: "Escreva sua mensagem.",
      messageShort: "Escreva um pouco mais. Pelo menos dez caracteres.",
    },
    states: {
      success: "Mensagem enviada. Respondo em até dois dias úteis.",
      error: "O envio falhou. Escreva direto para arthurtachini.dev@gmail.com.",
      notConfigured:
        "O formulário ainda não está conectado. Escreva direto para arthurtachini.dev@gmail.com.",
    },
  },

  footer: {
    navLabel: "Navegação",
    socialLabel: "Onde me encontrar",
    contactLabel: "Contato direto",
    backToTop: "Voltar ao topo",
  },
};

export default pt;

/**
 * Deliberately NOT `as const` — the literal types would make every English
 * string a type error rather than a translation. The shape is what matters.
 */
export type Dictionary = typeof pt;
