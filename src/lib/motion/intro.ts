"use client";

import { LOADER } from "./config";

/**
 * Coordination between the opening sequence and the hero.
 *
 * Whether the intro runs at all is decided by a blocking inline script before
 * the first paint (see `IntroGateScript` in components/layout/Intro.tsx), which
 * is the only way to know about sessionStorage, the URL hash and the motion
 * preference without either a hydration error or a visible flash.
 */

export const INTRO_CLASS = "intro-active";

export function introIsActive(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains(INTRO_CLASS)
  );
}

let finished = false;
const waiting = new Set<() => void>();

/**
 * Runs `callback` when the curtain starts lifting — or immediately if there is
 * no curtain, which is the case for every visit after the first, for anyone
 * arriving at a deep link, and for anyone who asked for reduced motion.
 */
export function whenIntroDone(callback: () => void): () => void {
  if (finished || !introIsActive()) {
    callback();
    return () => {};
  }
  waiting.add(callback);
  return () => waiting.delete(callback);
}

export function markIntroDone() {
  if (finished) return;
  finished = true;
  for (const callback of waiting) callback();
  waiting.clear();
}

/**
 * The pre-paint decision, as a string because it has to be inlined into the
 * HTML. Keeping it here rather than in the component keeps the sessionStorage
 * key in one place with the rest of the loader config.
 */
export const INTRO_GATE_SCRIPT = `(function(){try{
var el=document.documentElement;
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
if(window.location.hash.length>1)return;
if(sessionStorage.getItem('${LOADER.sessionKey}'))return;
sessionStorage.setItem('${LOADER.sessionKey}','1');
el.classList.add('${INTRO_CLASS}');
}catch(e){}})();`;
