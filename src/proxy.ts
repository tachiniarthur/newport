import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, LOCALES } from "@/content/dictionaries";

/**
 * Next 16 renamed `middleware` to `proxy`. Runtime is Node and is not
 * configurable here.
 *
 * Only job: send a bare `/` to a locale. Portuguese is the default, but a
 * browser that clearly prefers English gets English — a recruiter abroad
 * should not have to find the language switch.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

function preferredLocale(request: NextRequest) {
  const header = request.headers.get("accept-language");
  if (!header) return DEFAULT_LOCALE;

  // Rank the header's entries by q-value and take the first one we support.
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number.parseFloat(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (base === "pt") return "pt";
    if (base === "en") return "en";
  }
  return DEFAULT_LOCALE;
}

export const config = {
  // Skip Next internals, the metadata routes, and anything with a file
  // extension — none of them are localised.
  matcher: ["/((?!_next|api|.*\\..*|opengraph-image|sitemap.xml|robots.txt).*)"],
};
