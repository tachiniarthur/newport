import { ImageResponse } from "next/og";

import { LOCALES, getDictionary, isLocale } from "@/content/dictionaries";
import { IDENTITY, currentYear, rulerYears } from "@/content/site";
import { activeYears } from "@/content/timeline";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = IDENTITY.fullName;

/** Prerender both cards at build time rather than on the first share. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

/**
 * The share card carries the site's signature — the two-lane career ruler —
 * rather than being a generic name-on-a-colour graphic. The values below are
 * the design tokens written out: Satori cannot read a stylesheet, so this is
 * the one place in the codebase where a colour is repeated by hand. Keep it in
 * step with the palette in app/globals.css.
 *
 * Satori supports flexbox and a subset of CSS; there is no grid here for that
 * reason. `params` is a Promise in Next 16.
 */
export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "pt";
  const dict = await getDictionary(locale);

  const now = new Date();
  const years = rulerYears(now);
  const thisYear = currentYear(now);
  const education = activeYears("education", thisYear);
  const work = activeYears("work", thisYear);

  const display = await loadDisplayFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#0b0c0e",
          color: "#ece7df",
          padding: "56px 64px",
          fontFamily: display ? "Display" : "sans-serif",
        }}
      >
        {/* The ruler, in miniature. */}
        <div style={{ display: "flex", flexDirection: "column", width: 96, marginRight: 48 }}>
          {years.map((year) => (
            <div key={year} style={{ display: "flex", flex: 1, alignItems: "stretch", gap: 6 }}>
              <span
                style={{
                  width: 44,
                  fontSize: 15,
                  letterSpacing: 1.6,
                  color: "#97938c",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {year}
              </span>
              <span
                style={{ width: 2, backgroundColor: education.has(year) ? "#ece7df" : "#2a2c31" }}
              />
              <span style={{ width: 2, backgroundColor: work.has(year) ? "#ece7df" : "#2a2c31" }} />
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {IDENTITY.nameLines.map((line) => (
              <span
                key={line}
                style={{
                  fontSize: 116,
                  fontWeight: 800,
                  letterSpacing: -5,
                  lineHeight: 0.88,
                }}
              >
                {line}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ width: "100%", height: 1, backgroundColor: "#2a2c31" }} />
            <div
              style={{
                display: "flex",
                gap: 14,
                marginTop: 20,
                fontSize: 21,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: "#97938c" }}>{dict.meta.ogRole}</span>
              <span style={{ color: "#2a2c31" }}>·</span>
              <span style={{ color: "#d2683a" }}>SoftExpert</span>
              <span style={{ color: "#2a2c31" }}>·</span>
              <span style={{ color: "#97938c" }}>
                {IDENTITY.city} {IDENTITY.countryCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: display ? [{ name: "Display", data: display, weight: 800, style: "normal" }] : undefined,
    },
  );
}

/**
 * Fetched at build time. If the network is unavailable the card still renders,
 * just in the default face — a slightly off-brand share image is a much better
 * outcome than a failed build.
 */
async function loadDisplayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@800&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((res) => res.text());

    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;

    return await fetch(url).then((res) => res.arrayBuffer());
  } catch {
    return null;
  }
}
