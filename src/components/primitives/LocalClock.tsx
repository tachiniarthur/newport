"use client";

import { useEffect, useState } from "react";

import type { Locale } from "@/content/dictionaries";
import { formatLocalTime, timeZoneLabel } from "@/lib/time";

/**
 * Joinville wall clock, ticking. Rendered on the server too, so the line has
 * its final width in the first paint and never shifts layout — the seconds
 * digit is allowed to disagree across hydration, which is what
 * `suppressHydrationWarning` is for here.
 */
export function LocalClock({
  locale,
  className,
  showZone = false,
}: {
  locale: Locale;
  className?: string;
  showZone?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time
      suppressHydrationWarning
      dateTime={now.toISOString()}
      className={`tabular-nums ${className ?? ""}`}
    >
      {formatLocalTime(now, locale)}
      {showZone ? ` ${timeZoneLabel(now, locale)}` : null}
    </time>
  );
}
