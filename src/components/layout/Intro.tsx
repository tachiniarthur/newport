"use client";

import { useEffect, useRef } from "react";

import { IDENTITY } from "@/content/site";
import { DURATION, EASE, LOADER } from "@/lib/motion/config";
import { INTRO_CLASS, INTRO_GATE_SCRIPT, introIsActive, markIntroDone } from "@/lib/motion/intro";
import { useMotion } from "@/lib/motion/MotionProvider";
import { gsap } from "@/lib/motion/register";

/**
 * The opening sequence — built last, on purpose, so it decorates a page that
 * already works rather than being something the page depends on.
 *
 * It runs once per browser session, never when someone arrives at a link
 * pointing into the page, and not at all under reduced motion. All three of
 * those are decided before the first paint by the inline script below, so a
 * returning visitor never sees a curtain flash.
 *
 * Total choreography is 2.15s against the 2.5s ceiling, and the counter holds
 * just short of 100 until the webfonts have actually landed.
 */
export function IntroGateScript() {
  return <script dangerouslySetInnerHTML={{ __html: INTRO_GATE_SCRIPT }} />;
}

export function Intro() {
  const curtain = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const { stop, start } = useMotion();
  const started = useRef(false);

  useEffect(() => {
    // A plain effect, not `useGSAP`. useGSAP reverts everything created inside
    // its scope on cleanup, and StrictMode's development double-invoke would
    // therefore tear this sequence down a frame after starting it. The opening
    // is a one-shot tied to the page load, not a component-scoped animation
    // that should rewind when the component unmounts.
    if (started.current) return;
    started.current = true;

    if (!introIsActive()) {
      markIntroDone();
      return;
    }

    stop();

    const progress = { value: 0 };
    const render = () => {
      const shown = Math.round(progress.value);
      if (counter.current) counter.current.textContent = String(shown).padStart(3, "0");
      if (bar.current) gsap.set(bar.current, { scaleX: shown / 100 });
    };

    // Whichever comes first: the fonts are ready, or we have spent as long as
    // we are willing to spend waiting for them.
    let fontsSettled = false;
    const fontsReady = Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((resolve) => window.setTimeout(resolve, LOADER.maxMs - 900)),
    ]);

    const timeline = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove(INTRO_CLASS);
        start();
      },
    });

    timeline
      .to(progress, { value: 99, duration: 1.2, ease: "power2.inOut", onUpdate: render })
      // Hold just short of 100 until the fonts have actually landed. The
      // callback covers the case where they landed before the playhead got
      // here; the promise covers the case where they had not.
      .addPause(undefined, () => {
        if (fontsSettled) timeline.play();
      })
      .to(progress, { value: 100, duration: 0.15, ease: "none", onUpdate: render })
      .to(curtain.current, {
        yPercent: -100,
        duration: DURATION.curtain,
        ease: EASE.mask,
        // Released as the curtain starts moving, not when it finishes — the
        // hero is meant to already be in motion as it is uncovered.
        onStart: markIntroDone,
      });

    fontsReady.then(() => {
      fontsSettled = true;
      timeline.play();
    });

    // Safety net. Scroll is locked while the curtain is up, so if anything in
    // the sequence throws or stalls, the page must not be left unscrollable.
    const failsafe = window.setTimeout(() => {
      if (timeline.progress() < 1) {
        timeline.kill();
        document.documentElement.classList.remove(INTRO_CLASS);
        markIntroDone();
        start();
      }
    }, LOADER.maxMs + 1500);

    return () => window.clearTimeout(failsafe);
  }, [stop, start]);

  return (
    <div
      ref={curtain}
      aria-hidden="true"
      // Hidden unless the pre-paint script decided otherwise, so this costs
      // nothing on any visit after the first.
      className="intro-curtain fixed inset-0 z-50 hidden flex-col justify-end bg-paper p-[var(--gutter)] pb-12"
    >
      <span className="label text-ink">{IDENTITY.shortName}</span>

      <div className="mt-4 flex items-end justify-between gap-6">
        <span
          ref={counter}
          className="font-mono text-display-l tabular-nums text-ink"
          style={{ fontWeight: 400 }}
        >
          000
        </span>
      </div>

      {/* The rule is the progress bar. One element, doing both jobs. */}
      <span className="mt-6 block h-px w-full bg-rule">
        <span
          ref={bar}
          className="block h-px w-full origin-left bg-accent"
          style={{ transform: "scaleX(0)" }}
        />
      </span>
    </div>
  );
}
