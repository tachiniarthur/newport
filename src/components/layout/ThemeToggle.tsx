"use client";

import { THEME_GATE_SCRIPT, applyTheme, currentTheme } from "@/lib/theme";

/** Must run before the first paint — see lib/theme.ts. */
export function ThemeGateScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_GATE_SCRIPT }} />;
}

/**
 * One button, no React state.
 *
 * Which icon shows is decided in CSS from the `data-theme` attribute on <html>,
 * so the button is already correct on the first painted frame and there is
 * nothing for hydration to disagree about. The icon shown is the scheme the
 * button switches *to*.
 */
export function ThemeToggle({ label }: { label: string }) {
  // The site does not follow the OS: dark is what it is, and this button is
  // the way out of it. See lib/theme.ts.
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => applyTheme(currentTheme() === "dark" ? "light" : "dark")}
      className="theme-toggle flex items-center text-muted transition-colors duration-200 hover:text-ink"
    >
      <MoonIcon />
      <SunIcon />
    </button>
  );
}

/* Hairline icons at the weight of the rest of the page: 1px strokes, no fills. */

function MoonIcon() {
  return (
    <svg
      data-icon="moon"
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.5 9.4A5.6 5.6 0 0 1 5.6 2.5a5.6 5.6 0 1 0 6.9 6.9Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      data-icon="sun"
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="7.5" r="3.1" />
      <path d="M7.5 1v1.6M7.5 12.4V14M14 7.5h-1.6M2.6 7.5H1M12.1 2.9l-1.1 1.1M4 11l-1.1 1.1M12.1 12.1 11 11M4 4 2.9 2.9" />
    </svg>
  );
}
