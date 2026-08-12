"use client";

import { useRef } from "react";

import { SectionHead } from "@/components/primitives/SectionHead";
import type { Dictionary } from "@/content/dictionaries";
import { CAREER_START_YEAR, yearsOfExperience } from "@/content/site";
import { EASE, MEDIA } from "@/lib/motion/config";
import { useLineReveal, useRevealEach } from "@/lib/motion/hooks";
import { gsap } from "@/lib/motion/register";
import { useGSAP } from "@gsap/react";

/**
 * Narrow editorial column beside a hairline that arrives by mask — a wipe,
 * not a fade — and drifts against the scroll.
 */
export function About({ dict }: { dict: Dictionary }) {
  const scope = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLineReveal(scope);
  useRevealEach(scope, "[data-reveal]");
  usePortraitMotion(scope, frame, inner);

  const experience = yearsOfExperience();

  const facts = [
    { label: dict.about.meta.sinceLabel, value: String(CAREER_START_YEAR) },
    { label: dict.about.meta.experienceLabel, value: String(experience) },
    { label: dict.about.meta.cityLabel, value: dict.about.meta.cityValue },
    { label: dict.about.meta.degreeLabel, value: dict.about.meta.degreeValue },
    { label: dict.about.meta.languagesLabel, value: dict.about.meta.languagesValue },
  ];

  return (
    <section
      ref={scope}
      id="about"
      aria-labelledby="about-title"
      className="shell section"
    >
      <SectionHead index={1} eyebrow={dict.about.eyebrow} title={dict.about.title} id="about-title" />

      <div className="grid-editorial pt-16 lg:pt-24">
        {/* Hard facts, in mono, in the metadata column. */}
        <dl className="col-span-4 flex flex-col gap-6 lg:col-span-2">
          {facts.map((fact) => (
            <div key={fact.label} data-reveal>
              <dt className="label">{fact.label}</dt>
              {/* Labels in the muted mono, answers in the wire's own colour:
                  the column reads as one thing being asked and answered five
                  times, rather than as ten lines of metadata at one weight. */}
              <dd className="label mt-1 text-accent tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {/* The portrait used to live here. It is the hero now — running it
            twice on one page would spend the same card twice — so this column
            keeps only the mask-and-drift motion, on a rule that marks where
            the section starts. */}
        <figure ref={frame} className="col-span-4 overflow-hidden lg:col-span-1 lg:col-start-3">
          <div ref={inner} className="h-full min-h-24 w-px bg-rule" />
        </figure>

        <div className="col-span-4 flex flex-col gap-6 lg:col-span-7 lg:col-start-5">
          {dict.about.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} data-reveal className="measure font-body text-body-m">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Mask reveal plus parallax. Both are transform-only: the frame clips, the
 * inner element travels. Nothing here touches a layout property.
 */
function usePortraitMotion(
  scope: React.RefObject<HTMLElement | null>,
  frame: React.RefObject<HTMLDivElement | null>,
  inner: React.RefObject<HTMLDivElement | null>,
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MEDIA.anyMotion, () => {
        // Wipe: the frame opens from the bottom edge upward.
        gsap.fromTo(
          frame.current,
          { clipPath: "inset(100% 0% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.78,
            ease: EASE.mask,
            scrollTrigger: {
              trigger: frame.current,
              start: "top 85%",
              end: "bottom top",
              once: true,
              invalidateOnRefresh: true,
            },
          },
        );

        // Drift. Explicit start and end, recalculated on resize.
        gsap.fromTo(
          inner.current,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: "none",
            scrollTrigger: {
              trigger: frame.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      mm.add(MEDIA.motionReduced, () => {
        gsap.set(frame.current, { clipPath: "none" });
        gsap.set(inner.current, { yPercent: 0 });
      });

      return () => mm.revert();
    },
    { scope },
  );
}
