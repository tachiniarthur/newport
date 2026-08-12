"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { SectionHead } from "@/components/primitives/SectionHead";
import type { Dictionary } from "@/content/dictionaries";
import { TESTIMONIALS, type Testimonial } from "@/content/testimonials";
import { MEDIA } from "@/lib/motion/config";
import { useLineReveal, useRevealOnScroll } from "@/lib/motion/hooks";
import { gsap } from "@/lib/motion/register";

/**
 * Eight recommendations, as cards on a rail, and the one place on the page where
 * the scroll stops moving the page.
 *
 * When the section fills the window it is held there, and from that moment the
 * scroll drives the rail sideways instead: the cards that were past the right
 * edge arrive one after another, at a rate the reader sets, and the page is
 * released the moment the last one has landed. Nothing is on a timer and
 * nothing loops — the scroll is still the only transport, so the band is never
 * moving while somebody is trying to read it, and taking the scroll back takes
 * the rail back with it.
 *
 * What gets pinned is the whole composition — heading, progress rule and rail
 * together — and that is the correction this section needed. Pinning the rail
 * on its own held the cards while the heading above them carried on scrolling:
 * the display-size title slid up *behind* the cards, which is the one thing on
 * the page that reads as broken rather than as designed. Everything that is on
 * screen while the page is held now belongs to the same box, so the only thing
 * moving during the hold is the thing the hold exists for.
 *
 * The pinned box is a child of the section rather than the section itself. The
 * cable is measured against `section` boxes in document coordinates (see
 * CableTrace), and a pinned element is `position: fixed` — pinning the section
 * would hand the cable a viewport coordinate to route by. As an inner box, the
 * pin spacer stays inside the section and the section's own geometry never
 * changes.
 *
 * The box is a screen tall on the desktop breakpoint, with its contents
 * centred, so the moment it locks is the moment it exactly fills the window —
 * no band of empty page above or below, and no second frame where something
 * shifts as the pin engages.
 *
 * Widths carry the difference in length. These are somebody else's sentences,
 * quoted whole, and they run from 40 words to 157 — a rail of equal cards makes
 * every one of them as tall as the longest, and four fifths of the band is then
 * empty. So the long ones get a wide card and the rest get a narrow one, which
 * puts them within a few lines of each other; the little that is left over is
 * white space inside a card, which is what a card is for. The wide card is also
 * what keeps the tallest card short enough for the composition to fit a window.
 *
 * Where there is no pin — a phone, a short window, reduced motion — the cards
 * are not a rail at all. They stack, and the page is scrolled down them the way
 * every other section is read. That is the default state in the markup and the
 * `rail-pin:` variant is what turns it sideways, on exactly the three
 * conditions `useRailScrub` pins on, so the arrangement that needs no
 * JavaScript is the one the page ships with.
 *
 * The rail must not outlive the pin, and that is the whole reason the variant
 * exists rather than a plain `lg:`. A sideways rail with nothing transporting
 * it keeps a horizontal scrollbar of its own and nothing else: the page scrolls
 * past a band showing two of the eight cards, and the other six are behind a
 * scrollbar the reader has no reason to look for. A window 1200 wide and 700
 * tall is an ordinary laptop and it landed in exactly that state.
 *
 * The one case that is a rail without a pin is a display wide enough to fit the
 * whole rail already — `useRailScrub` measures zero travel and pins nothing,
 * which is correct, because everything is on screen.
 */
export function Testimonials({ dict }: { dict: Dictionary }) {
  const scope = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLUListElement>(null);
  const progress = useRef<HTMLSpanElement>(null);

  useLineReveal(scope);
  useRevealOnScroll(scope);
  useRailScrub({ scope, stage, viewport, rail, progress });

  const wide = widthGrades(TESTIMONIALS);

  return (
    // `z-30` sits the section above the cable layer (z-20): the rail slides
    // left into the lane the cable runs down, and the cable passes behind the
    // cards rather than over them. It belongs here, on the section, because a
    // pinned box is a stacking context of its own — a z-index set inside one
    // cannot lift anything out of it.
    <section
      ref={scope}
      id="testimonials"
      aria-labelledby="testimonials-title"
      className="section relative z-30"
    >
      {/* The box that gets pinned. A screen tall where the pin exists, with its
          contents centred in it, so what locks into place is a composition that
          already fits the window. Its height is a minimum rather than a fixed
          height: a long quote at a narrow desktop width is allowed to make it
          taller and scroll normally, which is better than clipping a card. */}
      <div
        ref={stage}
        className="flex flex-col justify-center gap-16 rail-pin:min-h-svh rail-pin:gap-12"
      >
        <div className="shell">
          <SectionHead
            index={5}
            eyebrow={dict.testimonials.eyebrow}
            title={dict.testimonials.title}
            id="testimonials-title"
            // Only on the English page, where the quotes below are in a
            // language the rest of the page is not. Null in Portuguese, where
            // saying it would be saying nothing.
            aside={
              dict.testimonials.note ? (
                <p className="label" data-reveal>
                  {dict.testimonials.note}
                </p>
              ) : undefined
            }
          />

          {/* How far through the rail the reader is. The page has stopped
              answering the scroll the way the rest of it does, and this is what
              says the scroll is being spent rather than ignored — one hairline,
              in a page already made of them. Where nothing is pinned it is
              simply a rule under the heading. */}
          <div className="mt-8 hidden h-px w-full bg-rule lg:block">
            <span
              ref={progress}
              aria-hidden="true"
              className="block h-px w-full origin-left scale-x-0 bg-accent"
            />
          </div>
        </div>

        {/* A scroll container by default, so every card is reachable with no
            JavaScript at all. `useRailScrub` swaps it for `overflow-x-clip`
            while the pin is live — the rail then runs off the right of the
            window with no scrollbar of its own, and the y axis stays visible so
            nothing cuts the card borders. */}
        <div ref={viewport} className="w-full overflow-x-auto [scrollbar-width:thin]">
          <ul
            ref={rail}
            className="quote-rail shell-inset flex flex-col gap-6 pr-[var(--gutter)] pb-1 rail-pin:w-max rail-pin:flex-row rail-pin:items-stretch rail-pin:gap-6"
          >
            {TESTIMONIALS.map((person) => (
              <li
                key={person.id}
                // Narrower than they want to be, and the rail's pace is why:
                // the reader scrolls at their own speed and the cards sweep
                // past sideways at whatever multiple of it the rail's length
                // works out to. Every px of card width is a px the rail has to
                // travel in the same stretch of scroll, so width is bought back
                // as reading time. See `useRailScrub`.
                //
                // Both grades are set at the widest their measure will take:
                // the narrow card lands around 68 characters a line, which is
                // the middle of the range running text wants to be read at, and
                // the wide one is already past it. Past these the line is long
                // enough that the eye loses its place returning to the left
                // edge, and the card would be trading height for a worse read
                // rather than a shorter one.
                //
                // Stacked, the card has no rail to be narrower than, so the
                // only thing setting its width is the measure — the same 50rem
                // ceiling the wide card is held to, rather than the full width
                // of a desktop window, which would run a quote out to 170
                // characters a line.
                className={`flex max-w-[50rem] ${
                  wide.has(person.id) ? "rail-pin:w-[50rem]" : "rail-pin:w-[30rem]"
                }`}
              >
                <Card person={person} dict={dict} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Card({ person, dict }: { person: Testimonial; dict: Dictionary }) {
  const copy = dict.testimonials.people[person.id as keyof typeof dict.testimonials.people];

  return (
    <figure className="quote-card flex w-full flex-col p-7 lg:p-8">
      {/* The relation, and a rule running out to the edge of the card. It is
          the fact the reader sorts on — who this person is to Arthur — so it
          opens the card rather than closing it. */}
      <div className="flex items-center gap-4">
        <figcaption className="label whitespace-nowrap">{copy.relation}</figcaption>
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
      </div>

      {person.href ? (
        <a
          href={person.href}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-5 font-display text-display-s text-ink transition-colors duration-200 hover:text-accent"
        >
          {person.name}
        </a>
      ) : (
        /* FALTA: URL do LinkedIn — o nome fica sem link em vez de apontar para lugar nenhum. */
        <p className="mt-5 font-display text-display-s text-ink">{person.name}</p>
      )}

      <blockquote lang={person.lang} className="mt-6 flex flex-col gap-4">
        {person.quote.map((paragraph, i) => (
          <p key={i} className="font-body text-body-s">
            {paragraph}
          </p>
        ))}
      </blockquote>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * How much scroll the reader spends per px the rail travels.
 *
 * The whole point of holding the page is that this number is authored rather
 * than inherited. Unpinned, the rail would have to cover its travel over
 * however tall the section happened to be, so the pace would be a side effect
 * of the length of eight quotes — and that comes out at very nearly one to one,
 * which is a card and a half a flick and no reading any of them. Pinned, the
 * travel and the scroll are two independent numbers and this is the ratio
 * between them.
 *
 * Above one the cards move slower than the page would have. Too far above and
 * the hold outstays its welcome: the reader is stationary on a page that is not
 * responding the way the rest of it does, and the only thing that makes that
 * bearable is that something is visibly moving in exchange.
 */
const SCROLL_PER_PX = 1.4;

/**
 * The one pin on the page below the hero. The composition stops, the scroll
 * drives the rail sideways instead, and when the last card has arrived the page
 * carries on.
 *
 * `travel` is the distance the rail has to cover: measured every refresh rather
 * than authored, because it is the difference between two things nobody
 * controls — how wide the cards came out once the webfont landed, and how wide
 * the window is. Where the rail already fits, there is nothing to transport and
 * nothing is pinned at all, which is the correct behaviour on a very wide
 * display; the band keeps its ordinary scroll container and the section behaves
 * like every other one.
 *
 * `ease: none` is not a default here, it is the point. Any curve on a pinned
 * scrub is the rail refusing to go where the reader is putting it: they are no
 * longer watching a section go past, they are dragging the cards by hand, and a
 * hand that pushes an inch and gets a quarter of one back reads as lag rather
 * than as pacing. The shaping that used to live in the ease is in
 * `SCROLL_PER_PX`, where it belongs — one rate, honestly applied.
 *
 * Pinned from `top top`, which is where a screen-tall box wants to lock:
 * exactly as it finishes arriving. Anything else would hold the page with part
 * of the composition still off an edge.
 *
 * Wide, tall, motion-friendly windows only. Below the desktop breakpoint the
 * cards are stacked and there is nothing to transport; in a short window the
 * composition does not fit the screen it would be locked into; under reduced
 * motion nothing is pinned at all. Each of those falls back to the same thing —
 * the band as a native scroll container — which is the one arrangement where
 * every recommendation is reachable without an animation.
 */
function useRailScrub(refs: {
  scope: React.RefObject<HTMLElement | null>;
  stage: React.RefObject<HTMLDivElement | null>;
  viewport: React.RefObject<HTMLDivElement | null>;
  rail: React.RefObject<HTMLUListElement | null>;
  progress: React.RefObject<HTMLSpanElement | null>;
}) {
  const { scope, stage, viewport, rail, progress } = refs;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MEDIA.railPin, () => {
        const stageEl = stage.current;
        const viewportEl = viewport.current;
        const railEl = rail.current;
        if (!stageEl || !viewportEl || !railEl) return;

        const travel = () => Math.max(0, railEl.scrollWidth - viewportEl.clientWidth);
        // Nothing to transport: no pin, and the band stays a scroll container
        // it does not need. Leaving the trigger in place with a zero-length
        // range would hold the page for no reason.
        if (travel() === 0) return;

        // While the pin is live the native scroll of the band would be a second
        // way to move the rail, fighting the first. Taken away here and given
        // back on cleanup, so the markup's own fallback is never edited away
        // permanently.
        viewportEl.classList.remove("overflow-x-auto");
        viewportEl.classList.add("overflow-x-clip");

        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: stageEl,
            pin: stageEl,
            start: "top top",
            end: () => `+=${Math.round(travel() * SCROLL_PER_PX)}`,
            // The pin is taken a frame early. Lenis hands ScrollTrigger a
            // smoothed position, and a pin applied exactly on the boundary
            // lands a frame late at speed — which the reader sees as the
            // section jumping as it locks.
            anticipatePin: 1,
            // A little smoothing, and no more: Lenis is already easing the
            // scroll, but this is direct manipulation now and lag is felt.
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });

        timeline.fromTo(railEl, { x: 0 }, { x: () => -travel() }, 0);
        if (progress.current) {
          timeline.fromTo(progress.current, { scaleX: 0 }, { scaleX: 1 }, 0);
        }

        return () => {
          timeline.kill();
          viewportEl.classList.remove("overflow-x-clip");
          viewportEl.classList.add("overflow-x-auto");
          gsap.set(railEl, { clearProps: "transform" });
          if (progress.current) gsap.set(progress.current, { clearProps: "transform" });
        };
      });

      return () => mm.revert();
    },
    { scope },
  );
}

/**
 * Which cards are set wide.
 *
 * Not an editorial ranking — it is which quotes will not fit a narrow card
 * without making every card on the rail as tall as they are. That is a fact
 * about one quote against one card width, so the threshold is an absolute
 * number of characters and not a position in the set.
 *
 * It used to be a multiple of the median, and that was wrong in a way worth
 * recording: the grade a card got depended on the *other* quotes. Adding two
 * long recommendations pulled the median up past the quote that had been the
 * reason the wide card existed, and every card on the rail silently went
 * narrow — the tallest one twice the height of its neighbours, nothing in this
 * file touched. A card is too tall or it is not; the rest of the list has no
 * say in it.
 *
 * The number is where a quote stops fitting the narrow card in the height the
 * pinned composition has to spare — a shade over half the longest one here, so
 * the three long quotes take the wide card and the five short ones do not. It
 * wants revisiting only if the card widths or `--text-body-s` move.
 */
const WIDE_ABOVE_CHARS = 700;

function widthGrades(people: readonly Testimonial[]): Set<string> {
  const length = (person: Testimonial) =>
    person.quote.reduce((total, paragraph) => total + paragraph.length, 0);

  return new Set(people.filter((person) => length(person) > WIDE_ABOVE_CHARS).map((p) => p.id));
}
