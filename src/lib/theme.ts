/**
 * Light and dark, decided before the first paint.
 *
 * Like the intro gate, this has to happen in a blocking inline script:
 * localStorage and the OS preference are both unknowable on the server, and
 * reading them after hydration would mean a visible flash of the wrong scheme.
 * The script writes `data-theme` on <html>; every colour in the site is a token
 * that attribute re-points, so no component needs to know which scheme is on.
 */

export type Theme = "light" | "dark";

export const THEME_ATTRIBUTE = "data-theme";
export const THEME_STORAGE_KEY = "theme";

/**
 * Inlined into the HTML, so it is written as a string.
 *
 * Dark is the identity of the site and therefore the default, including for a
 * reader whose OS asks for light: what the OS preference buys is not the
 * scheme, it is the toggle, which is one click away and remembered. Dark is
 * also the fallback on any failure — a private-mode browser that throws on
 * storage still gets the page it was designed as.
 */
export const THEME_GATE_SCRIPT = `(function(){var t='dark';try{
var s=localStorage.getItem('${THEME_STORAGE_KEY}');
if(s==='dark'||s==='light')t=s;
}catch(e){}document.documentElement.setAttribute('${THEME_ATTRIBUTE}',t);})();`;

/** The DOM is the single source of truth — there is no second copy in React. */
export function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute(THEME_ATTRIBUTE) === "light" ? "light" : "dark";
}

/** `persist: false` for a change that followed the OS rather than the reader. */
export function applyTheme(theme: Theme, { persist = true }: { persist?: boolean } = {}) {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  if (!persist) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage being unavailable costs the choice its persistence, nothing more.
  }
}

/** Whether the reader has chosen a scheme, as opposed to inheriting the OS one. */
export function hasStoredTheme(): boolean {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light";
  } catch {
    return false;
  }
}
