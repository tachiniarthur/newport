import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import "../globals.css";

import { CableTrace } from "@/components/layout/CableTrace";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Intro, IntroGateScript } from "@/components/layout/Intro";
import { ThemeGateScript } from "@/components/layout/ThemeToggle";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_TAGS,
  getDictionary,
  isLocale,
} from "@/content/dictionaries";
import { IDENTITY, SITE_URL } from "@/content/site";
import { fontVariables } from "@/lib/fonts";
import { MotionProvider } from "@/lib/motion/MotionProvider";

/** Both locales are prerendered, so both are statically indexable. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  // Dark is the site's own scheme, so it is what the browser chrome is told
  // unless the reader has explicitly asked for light.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b0c0e" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
  colorScheme: "dark light",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);

  return {
    metadataBase: new URL(SITE_URL),
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: IDENTITY.fullName,
    authors: [{ name: IDENTITY.fullName, url: SITE_URL }],
    creator: IDENTITY.fullName,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        "pt-BR": "/pt",
        en: "/en",
        "x-default": `/${DEFAULT_LOCALE}`,
      },
    },
    openGraph: {
      type: "profile",
      siteName: IDENTITY.fullName,
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${lang}`,
      locale: LOCALE_TAGS[lang].replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    // Both suppressHydrationWarning are for attributes written before React
    // hydrates, and each is scoped to its own element so neither masks a
    // mismatch anywhere else:
    //   <html> — the pre-paint gate scripts set `data-theme` and the intro
    //            class, which is the whole point of them running that early.
    //   <body> — browser extensions inject their own attributes here
    //            (cz-shortcut-listen, grammarly, …) before React loads. Nothing
    //            we render on <body> depends on client state, so there is no
    //            real mismatch left for the warning to catch.
    <html lang={LOCALE_TAGS[lang]} className={fontVariables} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Both must run before the first paint — see lib/theme.ts and
            components/layout/Intro.tsx. */}
        <ThemeGateScript />
        <IntroGateScript />

        <MotionProvider>
          <Intro />
          <a
            href="#main"
            className="label sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-raised focus:px-4 focus:py-3 focus:text-ink"
          >
            {dict.nav.skipToContent}
          </a>

          {/* The cable is measured against this box and drawn over it, so it
              has to be the positioning context for everything it crosses — and
              the header sits inside it because the header is laid over the top
              of the hero rather than stacked above it. The hero needs the full
              viewport: it is pinned, and a stage shorter than the screen would
              leave a band of empty page under the wires as they run off its
              bottom edge. */}
          <div className="relative">
            <Header lang={lang} dict={dict} />
            <main id="main">{children}</main>
            <Footer dict={dict} />
            <CableTrace dict={dict} />
          </div>
        </MotionProvider>
      </body>
    </html>
  );
}
