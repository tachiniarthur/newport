import type { Dictionary, Locale } from "@/content/dictionaries";
import { IDENTITY, SITE_URL, SOCIALS } from "@/content/site";

/**
 * Structured data. Everything here is asserted elsewhere on the page in
 * human-readable form — nothing is claimed to a crawler that a visitor cannot
 * also read.
 */
export function PersonJsonLd({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: IDENTITY.fullName,
    alternateName: IDENTITY.shortName,
    url: `${SITE_URL}/${lang}`,
    email: `mailto:${IDENTITY.email}`,
    jobTitle: dict.hero.role,
    description: dict.meta.description,
    worksFor: { "@type": "Organization", name: "SoftExpert" },
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "Univille" },
      { "@type": "EducationalOrganization", name: "Senai Joinville Norte" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: IDENTITY.city,
      addressRegion: IDENTITY.regionCode,
      addressCountry: IDENTITY.countryCode,
    },
    knowsLanguage: ["pt-BR", "en"],
    knowsAbout: ["PHP", "Laravel", "Vue", "React", "Next.js", "Java", "Spring Boot", "Docker", "SQL"],
    sameAs: SOCIALS.map((social) => social.href),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
