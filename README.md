# arthurtachini.dev

Portfolio of Arthur Henrique Tachini — Software Engineer, Joinville SC, Brazil.

Built from scratch: no template, no component library. Next.js 16 (App Router,
Turbopack), TypeScript in strict mode, Tailwind v4, GSAP as the primary motion
engine, anime.js v4 for a narrow set of micro-interactions, Lenis for smooth
scroll.

```bash
npm install
cp .env.example .env.local   # fill in the EmailJS keys, see "Contact form"
npm run dev
npm run build                # production build, must pass with no warnings
npx eslint src               # lint
npx tsc --noEmit             # typecheck
```

---

## Folder architecture

```
src/
├── app/
│   ├── [lang]/
│   │   ├── layout.tsx            root layout: fonts, providers, ruler, header, footer
│   │   ├── page.tsx              assembles the sections, in order
│   │   └── opengraph-image.tsx   share card, prerendered per locale
│   ├── actions/
│   │   └── contact.ts            Server Action: validates, then calls EmailJS
│   ├── globals.css               THE DESIGN SYSTEM — colour, type, rhythm
│   ├── robots.ts
│   └── sitemap.ts
├── proxy.ts                      redirects / to a locale (Next 16 renamed middleware → proxy)
├── content/                      all copy and data
│   ├── dictionaries/
│   │   ├── pt.ts                 Portuguese — the source of truth for copy shape
│   │   ├── en.ts                 English — typed as `typeof pt`
│   │   └── index.ts              locale list, loader, BCP 47 tags
│   ├── site.ts                   names, URLs, year maths
│   ├── timeline.ts               career milestones → drives the ruler AND the trajectory
│   ├── projects.ts               project list
│   ├── stack.ts                  technologies, grouped, with where each was used
│   ├── testimonials.ts           the four recommenders
│   └── media.ts                  image assets
├── components/
│   ├── layout/                   Ruler, Header, Footer, Intro
│   ├── sections/                 one file per section of the page
│   └── primitives/               SectionHead, LocalClock, PersonJsonLd
└── lib/
    ├── motion/
    │   ├── config.ts             ★ ALL animation values live here
    │   ├── register.ts           GSAP plugin registration, exactly once
    │   ├── MotionProvider.tsx    the single Lenis instance, wired to gsap.ticker
    │   ├── hooks.ts              the two shared reveal patterns
    │   └── intro.ts              opening-sequence gate
    ├── rulerBus.ts               sections → ruler messaging
    ├── time.ts                   Joinville clock
    ├── contact.ts                contact form state shape
    └── useMediaQuery.ts
```

---

## Where the text for each language lives

`src/content/dictionaries/pt.ts` and `src/content/dictionaries/en.ts`.

Portuguese is the default and defines the shape. `en.ts` is declared as
`const en: Dictionary`, where `Dictionary = typeof pt` — so **adding a key to
`pt.ts` without translating it in `en.ts` is a compile error**, not something
you find in production.

Routing is by sub-path: `/pt` and `/en`. Both are prerendered at build time, so
both are statically indexable, and each declares `hreflang` alternates pointing
at the other. `src/proxy.ts` sends a bare `/` to whichever locale the browser's
`Accept-Language` header prefers, defaulting to Portuguese.

The language switch is in `src/components/layout/Header.tsx`.

> Do not put copy in components. If a string is visible to a visitor, it belongs
> in a dictionary. The only exceptions are proper nouns identical in both
> languages (company names, technology names), which live in the data files
> alongside the thing they describe.

---

## Adding a new project

Two files, in this order:

**1. `src/content/projects.ts`** — append to `PROJECTS`:

```ts
{
  id: "my-project",              // the key that ties this to the dictionaries
  title: "My Project",
  year: 2025,                    // or null → the list renders an em dash
  tech: ["Laravel", "Vue"],
  links: [
    { kind: "repo", href: "https://github.com/tachiniarthur/my-project" },
    { kind: "demo", href: "https://example.com" },
  ],
  thumbnail: null,               // or { src: "/my-project.jpg", width, height }
  featured: false,               // exactly one project should be featured
}
```

**2. Both dictionaries** — add the matching entry under `projects.items`:

```ts
"my-project": {
  role: "Autor",
  description: "One or two sentences. What it is and who it is for.",
},
```

TypeScript will point at the missing key if you forget the second step.

`FEATURED_PROJECT` and `LISTED_PROJECTS` are derived at the bottom of
`projects.ts` — the featured one gets the large full-bleed treatment, the rest
go into the typographic list. Nothing else needs to change.

Adding a **timeline milestone** works the same way: append to `TIMELINE` in
`src/content/timeline.ts`, then add the matching `timeline.items` entry to both
dictionaries. The ruler picks up the new years automatically, because its
filled segments are computed from `TIMELINE` rather than hard-coded.

---

## Where the animation settings live

**`src/lib/motion/config.ts`.** Every duration, easing curve, stagger, scroll
offset and breakpoint is exported from that one file. If you want to change how
the site feels, that is the only file you need to open.

Two limits from the design brief are encoded as constants rather than left to
discipline — `REVEAL_MAX` (800ms) and `STAGGER_MAX` (60ms) — and a
development-only check at the bottom of the file warns in the console if any
value exceeds them.

### How the motion layer is put together

- **`register.ts`** registers the GSAP plugins exactly once, guarded against
  SSR. Anything that touches a plugin imports from here, so registration is
  guaranteed to have happened regardless of chunk order.
- **`MotionProvider.tsx`** owns the single Lenis instance and drives it from
  `gsap.ticker`, so smooth scroll and ScrollTrigger share one render pass and
  cannot desync. It calls `ScrollTrigger.refresh()` after
  `document.fonts.ready`, because triggers measured before the webfonts land
  are measured against the wrong text metrics.
- **`hooks.ts`** holds the two reveal patterns used everywhere:
  `useRevealOnScroll` (any `[data-reveal]` descendant) and `useLineReveal`
  (SplitText line masks on any `[data-split]`). Both are built on
  `gsap.matchMedia`, and both live inside `useGSAP` so every tween and trigger
  is reverted on unmount.

### Reduced motion

`prefers-reduced-motion: reduce` is honoured for real, not symbolically:

| | normal | reduced |
|---|---|---|
| Opening sequence | plays once per session | never runs |
| Smooth scroll | Lenis | native; Lenis is destroyed |
| Parallax | portrait drifts | none |
| Pinned trajectory | horizontal scrub | plain vertical list |
| Testimonial band | drifts, reacts to scroll | static stacked list |
| Reveals | mask + travel | short opacity fade |

CSS in `globals.css` also forces every `[data-reveal]` element visible under
that preference, so nothing can stay hidden because a script did not run.

### The engine boundary

GSAP owns everything scroll-linked. anime.js is used in exactly two places —
the stack list hover/dim in `sections/Stack.tsx` and the copy/status feedback in
`sections/Contact.tsx` — both scroll-independent micro-interactions. **No DOM
node is ever animated by both engines.** In the stack section the split is
explicit: GSAP reveals the group containers, anime.js owns opacity on the rows.
Keep it that way.

---

## The ruler

The fixed two-lane timeline in the left gutter (a thin bar across the top below
1024px) is the site's signature and the only element that persists down the
page. It is not a progress bar: the two 1px lanes are education and work, and
their filled segments come from `TIMELINE`, so the graphic shows that Arthur
worked through all four years of his degree without a sentence of copy.

Sections tell the ruler which years they are about. Ordinary sections do it
declaratively with a `data-years="2022 2023"` attribute, which the ruler sweeps
once on mount. The trajectory section announces directly through
`src/lib/rulerBus.ts`, because its triggers live on a horizontal
`containerAnimation` and a vertically-measured trigger would fire at the wrong
moment.

The ruler is `aria-hidden`. Everything it encodes is already available as text
in the trajectory section, so exposing it would only add a second, less readable
copy for screen reader users.

---

## Contact form

The form posts to a Server Action (`src/app/actions/contact.ts`) which validates
on the server and then calls the EmailJS REST API. EmailJS is called from the
server rather than the browser for two reasons: the validation requirement needs
a server to run on, and the private key stays out of the bundle.

Set four variables in Vercel (see `.env.example`):

```
EMAILJS_SERVICE_ID
EMAILJS_TEMPLATE_ID
EMAILJS_PUBLIC_KEY
EMAILJS_PRIVATE_KEY
```

The EmailJS template should expect `from_name`, `reply_to` and `message`. In the
EmailJS dashboard, **Account → Security → "Allow EmailJS API for non-browser
applications"** must be enabled or the private key is rejected.

With any variable unset the form still renders and still validates — it tells
the visitor the form is not connected and points at the email address, rather
than silently pretending to send. There is also a honeypot field.

---

## Outstanding content

Search the codebase for `FALTA:` — every place that needs real data is marked.
Nothing was invented to fill a gap.

- **Portrait photo** (`src/content/media.ts`) — About renders a labelled empty
  frame until one is supplied.
- **Project screenshots** (`src/content/projects.ts`).
- **Project years** — all null, the list renders em dashes.
- **Stack for Miranda and I Love My Duck.**
- **Where React, Python, CodeIgniter, jQuery, MySQL and MariaDB were used** —
  those rows render without a note rather than with a guess.
- **Testimonials** (`src/content/testimonials.ts`) — `quote` is null for all
  four people, deliberately. The verbatim text of their LinkedIn
  recommendations was not available, and inventing words to attribute to real,
  named people is not acceptable. Each card currently states what that person
  actually recommended Arthur for. Fill in `quote` and the component switches
  to real quotations automatically.
- **LinkedIn URLs for the four recommenders** — names render unlinked until then.

---

## Deployment

Vercel. `npm run build` must pass clean. Both locales and both OG cards are
prerendered at build time; only `proxy.ts` runs per request.

`SITE_URL` in `src/content/site.ts` is the canonical origin used by the sitemap,
the robots file and every metadata URL. Change it there if the domain changes.
