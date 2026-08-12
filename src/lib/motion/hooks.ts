"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";

import { DURATION, EASE, MEDIA, SHIFT, STAGGER, TRIGGER } from "./config";
import { SplitText, gsap } from "./register";

/**
 * The two reveal patterns used across the site. Both are built on
 * `gsap.matchMedia`, so the reduced-motion branch is a real alternative
 * behaviour rather than the same animation played faster — and both live
 * inside `useGSAP`, so every tween and trigger is reverted when the component
 * unmounts. Nothing here animates a property that triggers layout.
 */

type ScopeRef = RefObject<HTMLElement | null>;

/**
 * Reveals every `[data-reveal]` descendant of `scope` as it enters view.
 * Elements start at opacity 0 from CSS, so this is a `to`, not a `from` —
 * there is no frame where unstyled content is visible.
 */
export function useRevealOnScroll(
  scope: ScopeRef,
  options?: { stagger?: number; enabled?: boolean },
) {
  const stagger = options?.stagger ?? STAGGER.item;
  // The hero holds its reveal until the opening curtain starts lifting.
  const enabled = options?.enabled ?? true;

  useGSAP(
    () => {
      if (!enabled) return;
      const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      if (targets.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(MEDIA.anyMotion, () => {
        gsap.fromTo(
          targets,
          { opacity: 0, y: SHIFT.block },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.reveal,
            ease: EASE.out,
            stagger,
            scrollTrigger: {
              trigger: scope.current,
              start: TRIGGER.start,
              // Explicit end + once: the trigger is not left open-ended.
              end: "bottom top",
              once: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      mm.add(MEDIA.motionReduced, () => {
        // Content appears, briefly, with no travel.
        gsap.to(targets, { opacity: 1, y: 0, duration: 0.2, ease: "none" });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [stagger, enabled] },
  );
}

/**
 * The same reveal, but one trigger per element rather than one for the whole
 * scope.
 *
 * `useRevealOnScroll` fires everything it finds off a single trigger on the
 * section, which is right for a section the reader takes in at once and wrong
 * for a tall one: the entries at the bottom have already played by the time
 * anybody has scrolled to them, so they arrive on screen finished. Here each
 * element answers for itself, and nothing depends on another animation having
 * been measured first.
 */
export function useRevealEach(scope: ScopeRef, selector: string) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const targets = () => gsap.utils.toArray<HTMLElement>(selector);

      mm.add(MEDIA.anyMotion, () => {
        for (const target of targets()) {
          gsap.fromTo(
            target,
            { opacity: 0, y: SHIFT.block },
            {
              opacity: 1,
              y: 0,
              duration: DURATION.reveal,
              ease: EASE.out,
              scrollTrigger: {
                trigger: target,
                start: "top 88%",
                end: "bottom top",
                once: true,
                invalidateOnRefresh: true,
              },
            },
          );
        }
      });

      mm.add(MEDIA.motionReduced, () => {
        gsap.set(targets(), { opacity: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [selector] },
  );
}

/**
 * Line-by-line mask reveal for a headline. Uses SplitText's native `mask`
 * option (GSAP 3.13+) rather than hand-rolled wrapper divs, and `autoSplit`
 * so the split is recomputed when the webfont lands or the box reflows —
 * which is what stops lines from being clipped at the wrong height.
 */
export function useLineReveal(
  scope: ScopeRef,
  options?: { selector?: string; delay?: number; scrollTriggered?: boolean; enabled?: boolean },
) {
  const selector = options?.selector ?? "[data-split]";
  const delay = options?.delay ?? 0;
  const scrollTriggered = options?.scrollTriggered ?? true;
  const enabled = options?.enabled ?? true;

  useGSAP(
    () => {
      if (!enabled) return;
      const targets = gsap.utils.toArray<HTMLElement>(selector);
      if (targets.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(MEDIA.anyMotion, () => {
        const splits = targets.map((el) =>
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            linesClass: "split-line",
            onSplit(self) {
              // Container is opacity 0 from CSS; lifting it here and starting
              // the line travel in the same tick means no flash of raw text.
              gsap.set(el, { opacity: 1 });
              return gsap.from(self.lines, {
                yPercent: 110,
                duration: DURATION.reveal,
                ease: EASE.mask,
                stagger: STAGGER.line,
                delay,
                scrollTrigger: scrollTriggered
                  ? {
                      trigger: el,
                      start: TRIGGER.start,
                      end: "bottom top",
                      once: true,
                      invalidateOnRefresh: true,
                    }
                  : undefined,
              });
            },
          }),
        );

        return () => splits.forEach((s) => s.revert());
      });

      mm.add(MEDIA.motionReduced, () => {
        gsap.to(targets, { opacity: 1, duration: 0.2, ease: "none" });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [selector, delay, scrollTriggered, enabled] },
  );
}
