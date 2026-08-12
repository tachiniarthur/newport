"use client";

import Lenis from "lenis";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";

import { LENIS } from "./config";
import { ScrollTrigger, gsap } from "./register";

/**
 * The single place a Lenis instance exists. Plugin registration lives in
 * `./register`, which this imports so the order is guaranteed.
 *
 * The context deliberately exposes only behaviour, never the Lenis instance
 * itself. The instance lives in a ref, and a ref read during render would be
 * captured once — consumers would hold `null` forever, because creating Lenis
 * in an effect does not re-render. The three callbacks read the ref when they
 * are called, which is always after the effect has run.
 *
 * Nothing here needs the reduced-motion preference as React state either:
 * components branch on it through `gsap.matchMedia`, which reacts to changes
 * on its own.
 */

type MotionContextValue = {
  stop: () => void;
  start: () => void;
  scrollTo: (target: string | HTMLElement | number, offset?: number) => void;
};

const MotionContext = createContext<MotionContextValue>({
  stop: () => {},
  start: () => {},
  scrollTo: () => {},
});

export function useMotion() {
  return useContext(MotionContext);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    function tick(time: number) {
      // gsap.ticker reports seconds; Lenis wants milliseconds.
      lenisRef.current?.raf(time * 1000);
    }

    const teardownLenis = () => {
      if (!lenisRef.current) return;
      gsap.ticker.remove(tick);
      lenisRef.current.destroy();
      lenisRef.current = null;
      document.documentElement.classList.remove("lenis");
    };

    const setupLenis = () => {
      if (lenisRef.current) return;
      const lenis = new Lenis({
        duration: LENIS.duration,
        easing: LENIS.easing,
        wheelMultiplier: LENIS.wheelMultiplier,
        touchMultiplier: LENIS.touchMultiplier,
        // GSAP's ticker drives the loop instead, so smooth scroll and
        // ScrollTrigger share one render pass and cannot desync.
        autoRaf: false,
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      lenisRef.current = lenis;
    };

    const apply = () => {
      if (query.matches) {
        // Reduced motion means no smooth scroll at all, not a faster one.
        teardownLenis();
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      } else {
        setupLenis();
      }
      ScrollTrigger.refresh();
    };

    /**
     * A deep link is honoured by the browser before any of this exists: before
     * the webfonts have laid the text out and before the hero's pin spacer has
     * been inserted, both of which push the section down the page after the
     * jump has already happened. Someone arriving at `/pt#projects` therefore
     * lands about a viewport short of it — in the tail of the hero, where the
     * portrait has already come apart and there is nothing left to see. So the
     * jump is made again, once, against the settled layout.
     */
    const jumpToHash = () => {
      const hash = window.location.hash;
      if (hash.length <= 1) return;

      let node: HTMLElement | null = null;
      try {
        node = document.querySelector<HTMLElement>(hash);
      } catch {
        // A hash that is not a valid selector is not ours to handle.
        return;
      }
      if (!node) return;

      const top = node.getBoundingClientRect().top + window.scrollY;
      if (lenisRef.current) lenisRef.current.scrollTo(top, { immediate: true });
      else window.scrollTo({ top, behavior: "auto" });
    };

    apply();
    query.addEventListener("change", apply);

    // Triggers are measured against text that has not been laid out yet until
    // the webfonts land. Without this, every start/end offset is wrong.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      ScrollTrigger.refresh();
      jumpToHash();
    });

    return () => {
      cancelled = true;
      query.removeEventListener("change", apply);
      teardownLenis();
    };
  }, []);

  const stop = useCallback(() => {
    lenisRef.current?.stop();
    document.documentElement.classList.add("lenis-stopped");
  }, []);

  const start = useCallback(() => {
    lenisRef.current?.start();
    document.documentElement.classList.remove("lenis-stopped");
  }, []);

  const scrollTo = useCallback((target: string | HTMLElement | number, offset = 0) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset });
      return;
    }

    // Reduced-motion path: jump, do not glide.
    if (typeof target === "number") {
      window.scrollTo({ top: target + offset, behavior: "auto" });
      return;
    }
    const node = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (node) {
      window.scrollTo({
        top: node.getBoundingClientRect().top + window.scrollY + offset,
        behavior: "auto",
      });
    }
  }, []);

  const value = useMemo(() => ({ stop, start, scrollTo }), [stop, start, scrollTo]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
