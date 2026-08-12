"use client";

import type { ReactNode } from "react";

import { useMotion } from "@/lib/motion/MotionProvider";

/**
 * An in-page link that goes through Lenis instead of past it.
 *
 * Lenis owns the scroll position on this site, and it is not configured to
 * intercept anchors — so a plain `<a href="#stack">` hands the jump to the
 * browser, which moves the page underneath Lenis without telling it. Every
 * ScrollTrigger on the page is then measuring against a position Lenis still
 * believes is somewhere else, and the cable in particular is drawn to a head
 * that no longer matches the screen.
 *
 * The `href` stays real: it is what a middle-click, a copied link and a
 * screen reader all need, and it is the fallback if this never hydrates.
 * Only the click is taken.
 */
export function AnchorLink({
  to,
  className,
  children,
  ...rest
}: {
  /** The id being linked to, without the hash. */
  to: string;
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<"a">, "href" | "onClick" | "children">) {
  const { scrollTo } = useMotion();

  return (
    <a
      {...rest}
      href={`#${to}`}
      className={className}
      onClick={(event) => {
        // Let the browser have modified clicks — a new tab wants the URL, not
        // a scroll in this one.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        scrollTo(`#${to}`);
      }}
    >
      {children}
    </a>
  );
}
