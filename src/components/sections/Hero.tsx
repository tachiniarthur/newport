"use client";

import { useEffect, useRef, useState } from "react";

import { HeroPortrait, type HeroPortraitHandle } from "@/components/sections/HeroPortrait";
import { LocalClock } from "@/components/primitives/LocalClock";
import type { Dictionary, Locale } from "@/content/dictionaries";
import { IDENTITY } from "@/content/site";
import { DURATION, EASE, MEDIA, WIRE } from "@/lib/motion/config";
import { useLineReveal, useRevealOnScroll } from "@/lib/motion/hooks";
import { introIsActive, whenIntroDone } from "@/lib/motion/intro";
import { ScrollTrigger, gsap } from "@/lib/motion/register";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useGSAP } from "@gsap/react";

/**
 * The portrait is the composition, and the name is set behind it: two display
 * lines the body stands in front of, so the face covers the middle of them.
 *
 * Then the reader scrolls, and the whole thing comes apart — see
 * `HeroPortrait` for the machinery, and `CableTrace` for what happens to the
 * material after it leaves the bottom of this stage.
 */
export function Hero({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const scope = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const wires = useRef<HeroPortraitHandle | null>(null);

  const reduced = useMediaQuery(MEDIA.motionReduced);

  // Held until the opening curtain starts lifting, so the name is already
  // travelling as it is uncovered rather than having finished behind it.
  // Resolves immediately whenever there is no curtain, which is every visit
  // after the first.
  const [uncovered, setUncovered] = useState(() => !introIsActive());
  useEffect(() => whenIntroDone(() => setUncovered(true)), []);

  // The name plays on load rather than on scroll — it is already in view.
  useLineReveal(scope, { selector: "[data-split]", scrollTriggered: false, enabled: uncovered });
  useRevealOnScroll(scope, { enabled: uncovered });
  usePortraitEntrance(scope, uncovered);
  useDissolveScrub(scope, stage, overlay, wires);

  return (
    <section ref={scope} aria-labelledby="hero-name" className="relative">
      {/* `data-cable-stage` is the canvas's own box. `CableTrace` measures its
          height to retrace the last stretch of the hero's bundle with the same
          function the canvas drew it with — see the lead-in there. */}
      <div
        ref={stage}
        data-cable-stage
        className="relative flex h-[100svh] min-h-[560px] items-center justify-center overflow-hidden"
      >
        {/* Behind the body. The full name is carried for a screen reader; the
            two display lines are the composition. */}
        {/* Lifted off the centre line of the stage. Centred, the two lines sat
            square across the face and the shoulders — the widest, busiest part
            of the photograph — and the name was the one thing on the page that
            had to be worked out rather than read. Raised, the body covers the
            feet of the letters and nothing else: the name reads at a glance and
            is still behind him. */}
        <h1
          id="hero-name"
          className="pointer-events-none w-full -translate-y-[9svh] px-[var(--gutter)] text-center font-display text-display-name text-ink lg:-translate-y-[13svh]"
        >
          <span className="sr-only">{IDENTITY.fullName}</span>
          <span aria-hidden="true" data-split className="block opacity-0">
            Arthur
          </span>
          <span aria-hidden="true" data-split className="block opacity-0">
            Tachini
          </span>
        </h1>

        <HeroPortrait ref={wires} alt={dict.hero.photoAlt} reduced={reduced} />

        {/* Corner metadata, and the one instruction the page gives. All of it
            leaves as the transformation starts — by then it has been read. */}
        <div ref={overlay} className="pointer-events-none absolute inset-0">
          {/* On the container's own edges rather than the screen's, so they
              line up with the header directly above them — the container is
              inset on the left to leave the cable a lane to run in, and metadata
              pinned to the viewport instead would sit a lane away from the
              wordmark it is under. */}
          <div className="shell absolute inset-x-0 top-28 flex items-start justify-between gap-6 lg:top-32">
            <p className="label max-w-[14ch]" data-reveal>
              {dict.hero.role}
            </p>

            <p className="label flex items-baseline gap-3" data-reveal>
              <span>{IDENTITY.city}</span>
              <LocalClock locale={lang} className="text-ink tabular-nums" />
            </p>
          </div>

          <p
            className="label absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
            data-reveal
          >
            <span>{dict.hero.scrollHint}</span>
            <span aria-hidden="true" className="block h-10 w-px bg-rule" />
          </p>
        </div>
      </div>

      {/* Where the bundles land when the pin releases. `CableTrace` measures
          this to start its path, which is what makes the hand-off between the
          canvas and the page-long cable invisible. */}
      <div data-cable-start aria-hidden="true" className="h-0" />

      {/* The opening gap is wider than the rhythm would ask for, and the cable
          is why: it leaves the hero four hundred px to the right of its own
          lane, and everything below this rule is text it is not allowed to
          cross. This is the room it crosses in. `data-cable-clear` is the line
          it has to be clear of by — `CableTrace` measures it rather than
          assuming a number, so the two cannot drift apart. */}
      <div className="shell pt-16 pb-24 lg:pt-56 lg:pb-36">
        <hr data-cable-clear className="hairline" />
        <div className="grid-editorial pt-6">
          <p className="label col-span-4 self-start lg:col-span-3" data-reveal>
            {dict.hero.location}
          </p>
          <p
            data-reveal
            className="measure col-span-4 font-body text-body-l text-ink lg:col-span-6 lg:col-start-5"
          >
            {dict.hero.lede}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * The portrait arrives by clip, from the bottom edge upward — the same
 * direction the dissolve will later take it away in.
 */
function usePortraitEntrance(scope: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useGSAP(
    () => {
      if (!enabled) return;
      const target = scope.current?.querySelector<HTMLElement>(".portrait-veil");
      if (!target) return;

      const mm = gsap.matchMedia();

      mm.add(MEDIA.anyMotion, () => {
        gsap.from(target, {
          clipPath: "inset(100% 0% 0% 0%)",
          duration: DURATION.deliberate,
          ease: EASE.mask,
          delay: 0.12,
        });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [enabled] },
  );
}

/**
 * The one scroll-linked sequence on the page that is worth pinning for.
 *
 * The stage is held still for `WIRE.pinDistance` viewports while the portrait
 * comes apart, so the reader watches the transformation rather than chasing it
 * up the screen. Both branches do it and both do it the same way; they are kept
 * apart because they are two different windows being reasoned about, not
 * because they disagree.
 */
function useDissolveScrub(
  scope: React.RefObject<HTMLElement | null>,
  stage: React.RefObject<HTMLDivElement | null>,
  overlay: React.RefObject<HTMLDivElement | null>,
  wires: React.RefObject<HeroPortraitHandle | null>,
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      const fade = (element: HTMLElement | null, progress: number) => {
        if (!element) return;
        // The name and the captions are gone by the time the body is, and
        // they go without moving — anything travelling here would fight the
        // filaments, which are already travelling.
        gsap.set(element, { opacity: 1 - Math.min(1, progress / 0.38) });
      };

      const paint = (progress: number) => {
        wires.current?.draw(progress);
        fade(scope.current?.querySelector<HTMLElement>("h1") ?? null, progress);
        fade(overlay.current, progress);
      };

      /**
       * The stretch after the scrub, in which the stage still has a whole
       * screen to travel before it is off the top.
       *
       * Without this the canvas stops being redrawn the moment the scrub ends
       * and what is left on it — three lines and no body — rides up the screen
       * as a still image, which is the one thing on the page that does not
       * answer the reader. Here it keeps answering: the rope is drawn down into
       * the page over the same scroll that takes the stage away, and the canvas
       * is empty before it has gone.
       *
       * A trigger of its own rather than a longer scrub, because the pin has to
       * end where the transformation ends and a pin lasts a trigger's whole
       * range. It runs from where the scrub finished to where the stage's own
       * bottom edge clears the top of the screen — measured off the element
       * rather than off `innerHeight`, which is not the same number as `100svh`
       * on a phone.
       */
      const height = () => stage.current?.offsetHeight ?? window.innerHeight;

      /**
       * `onRefresh` fires on every trigger on the page whenever ScrollTrigger
       * recalculates, wherever the reader happens to be — including the refresh
       * that lands a moment after first paint, with the reader still at the top
       * and the scrub not yet begun. This trigger's own state at progress 0 is
       * a finished transformation, so painting it there put the hero at the far
       * side of something nobody had started: the mask erased the photograph
       * outright and the canvas drew the three bundles into an otherwise empty
       * screen. It corrected itself on the first pixel of scroll, when the
       * scrub's own `onUpdate` painted progress 0 over the top of it — which is
       * exactly how it read, as the page repairing itself.
       *
       * So it only paints once the scroll has actually reached its range. Above
       * it, the scrub owns the canvas and this has nothing to say.
       */
      const paintExit = (self: ScrollTrigger) => {
        if (self.scroll() < self.start) return;
        wires.current?.draw(1, self.progress);
      };

      const exit = (from: () => number, until: () => number) =>
        ScrollTrigger.create({
          trigger: scope.current ?? undefined,
          start: () => `top+=${from()} top`,
          end: () => `top+=${Math.max(until(), from() + 1)} top`,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: paintExit,
          onRefresh: paintExit,
        });

      mm.add(MEDIA.desktopMotion, () => {
        // Pinned, so the stage is still standing at the top of the screen when
        // the scrub ends and has its own height left to travel from there.
        const pinned = () => Math.round(window.innerHeight * WIRE.pinDistance);
        const trigger = scrub(scope.current, {
          pin: stage.current,
          end: () => `+=${pinned()}`,
          onUpdate: paint,
        });
        const leaving = exit(pinned, () => pinned() + height());
        return () => {
          trigger.kill();
          leaving.kill();
        };
      });

      mm.add(`${MEDIA.belowDesktop} and ${MEDIA.motionOk}`, () => {
        // The same arrangement, and for the same reason. This used to be the
        // unpinned branch: the stage travelled while it dissolved, so the
        // transformation happened on its way off the top of the screen and the
        // reader was chasing it up the page instead of watching it. On a phone
        // that reads worse than anywhere else — the stage is the whole screen,
        // so what leaves is everything, and what is left behind is a fan of
        // filaments hanging off the top of the running text.
        //
        // Held, the phone gets what the desktop gets: the picture comes apart
        // where it stands, and the page moves on only once it is wire.
        const pinned = () => Math.round(window.innerHeight * WIRE.pinDistance);
        const trigger = scrub(scope.current, {
          pin: stage.current,
          end: () => `+=${pinned()}`,
          onUpdate: paint,
        });
        const leaving = exit(pinned, () => pinned() + height());
        return () => {
          trigger.kill();
          leaving.kill();
        };
      });

      mm.add(MEDIA.motionReduced, () => {
        // No transformation at all: the portrait stays a portrait.
        paint(0);
      });

      return () => mm.revert();
    },
    { scope },
  );
}

/** The two branches above differ only in whether they pin and how far they
 *  run, so the trigger itself is written once. */
function scrub(
  trigger: HTMLElement | null,
  options: {
    pin?: HTMLElement | null;
    end: () => string;
    onUpdate: (progress: number) => void;
  },
) {
  return ScrollTrigger.create({
    trigger: trigger ?? undefined,
    start: "top top",
    end: options.end,
    pin: options.pin ?? false,
    pinSpacing: Boolean(options.pin),
    anticipatePin: options.pin ? 1 : 0,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => options.onUpdate(self.progress),
    // Covers the case where a refresh lands while the reader is already
    // inside the range — a resize, or the webfonts settling.
    onRefresh: (self) => options.onUpdate(self.progress),
  });
}
