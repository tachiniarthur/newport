import { AnchorLink } from "@/components/primitives/AnchorLink";
import type { Dictionary } from "@/content/dictionaries";
import { IDENTITY, SOCIALS, currentYear } from "@/content/site";

/** The sections the footer lists, in the order the page presents them. Same
 *  set the cable stops at, plus the one it lands on. */
const SECTIONS = ["about", "stack", "timeline", "projects", "testimonials", "contact"] as const;

/**
 * The last thing on the page, and the only place the whole of it is listed.
 *
 * It used to be a strip: three lines of mono, a ticking clock and a pair of
 * coordinates. The clock was the fourth on the page to say the same thing and
 * the coordinates said nothing anybody could use — metadata for its own sake,
 * under a page that had just spent six sections earning attention.
 *
 * So it closes properly instead: the name at the size of a section heading,
 * what he does and where, and then everything a reader who got this far might
 * actually want — the way back into any section, the accounts, the address.
 */
export function Footer({ dict }: { dict: Dictionary }) {
  const year = currentYear();

  return (
    <footer className="shell pt-28 pb-14 lg:pt-40 lg:pb-20">
      <hr className="hairline" />

      <div className="grid-editorial pt-12 lg:pt-20">
        <div className="col-span-4 lg:col-span-8">
          <p className="font-display text-display-l text-ink">{IDENTITY.fullName}</p>
          <p className="label mt-5">
            {dict.hero.role}
            <span aria-hidden="true" className="text-rule">
              {" · "}
            </span>
            {IDENTITY.city}, {IDENTITY.regionCode}
          </p>
        </div>
      </div>

      <div className="grid-editorial pt-16 lg:pt-24">
        <nav aria-label={dict.footer.navLabel} className="col-span-2 lg:col-span-3">
          <h2 className="label">{dict.footer.navLabel}</h2>
          <ul className="mt-6 flex flex-col gap-3">
            {SECTIONS.map((id) => (
              <li key={id}>
                <AnchorLink
                  to={id}
                  className="label text-ink transition-colors duration-200 hover:text-accent"
                >
                  {dict.nav.sections[id]}
                </AnchorLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-2 lg:col-span-3 lg:col-start-5">
          <h2 className="label">{dict.footer.socialLabel}</h2>
          <ul className="mt-6 flex flex-col gap-3">
            {SOCIALS.map((social) => (
              <li key={social.key}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="label text-ink transition-colors duration-200 hover:text-accent"
                >
                  {social.label}
                  <span className="text-muted"> {social.handle}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-4 lg:col-span-4 lg:col-start-9">
          <h2 className="label">{dict.footer.contactLabel}</h2>
          <a
            href={`mailto:${IDENTITY.email}`}
            className="mt-6 block font-display text-display-s break-words text-ink transition-colors duration-200 hover:text-accent"
          >
            {IDENTITY.email}
          </a>
        </div>
      </div>

      <hr className="hairline mt-20 lg:mt-28" />

      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pt-6">
        <p className="label text-ink">
          &copy; {year} {IDENTITY.fullName}
        </p>
        <AnchorLink
          to="main"
          className="label transition-colors duration-200 hover:text-ink"
        >
          {dict.footer.backToTop}
        </AnchorLink>
      </div>
    </footer>
  );
}
