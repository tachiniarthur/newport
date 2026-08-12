"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Plugins are registered exactly once, here. Any module that touches a plugin
 * imports this file, so registration is guaranteed to have run before its own
 * body evaluates — regardless of how the bundler orders chunks.
 *
 * Guarded against SSR: the plugins read `window` on registration.
 */
let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Observer);
  // Stops GSAP from compensating for dropped frames, which is what makes a
  // pinned section lurch after the main thread stalls.
  gsap.ticker.lagSmoothing(0);
  registered = true;
}

registerGsap();

export { Observer, ScrollTrigger, SplitText, gsap };
