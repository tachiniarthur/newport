import type { MetadataRoute } from "next";

import { LOCALES } from "@/content/dictionaries";
import { SITE_URL } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified,
    changeFrequency: "monthly",
    priority: locale === "pt" ? 1 : 0.8,
    alternates: {
      languages: {
        "pt-BR": `${SITE_URL}/pt`,
        en: `${SITE_URL}/en`,
      },
    },
  }));
}
