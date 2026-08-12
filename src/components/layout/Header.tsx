import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LOCALES, type Dictionary, type Locale } from "@/content/dictionaries";
import { IDENTITY } from "@/content/site";

/**
 * Laid over the top of the hero, and deliberately NOT fixed: nothing is meant
 * to persist down the page and compete with the content, so it scrolls away
 * with the hero it is sitting on.
 */
export function Header({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  return (
    <header className="shell absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-6 pt-8 pb-16 lg:pt-12">
      <p className="label text-ink">{IDENTITY.shortName}</p>

      <div className="flex items-center gap-6">
        <nav aria-label={dict.nav.languageLabel} className="flex items-baseline gap-3">
          {LOCALES.map((locale, index) => (
            <span key={locale} className="flex items-baseline gap-3">
              {index > 0 && (
                <span aria-hidden="true" className="label text-rule">
                  /
                </span>
              )}
              {/* A plain anchor, not `next/link`, and the scheme is why.
                  `<html>` is rendered by the `[lang]` layout, so a client-side
                  navigation between the two locales re-renders that element —
                  and React's reconciliation strips `data-theme` off it, because
                  no render it has ever done included that attribute. The
                  pre-paint script wrote it, not React. The reader picked light,
                  switched language, and the page came back dark with their
                  choice still sitting in localStorage, unread.
                  A document navigation runs the gate scripts again, before the
                  first paint, which is the only moment `data-theme` can be
                  restored without a flash of the wrong scheme. It costs a
                  prefetch on a two-page site and buys back the whole class of
                  bug — the intro class on `<html>` is written the same way. */}
              <a
                href={`/${locale}`}
                hrefLang={locale}
                aria-current={locale === lang ? "true" : undefined}
                className={`label transition-colors duration-200 hover:text-ink ${
                  locale === lang ? "text-ink" : "text-muted"
                }`}
              >
                {locale}
              </a>
            </span>
          ))}
        </nav>

        <ThemeToggle label={dict.nav.themeLabel} />
      </div>
    </header>
  );
}
