import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { docSlugs } from "@/lib/docs-content";
import { siteOrigin } from "@/lib/site";

const paths = ["", "/docs", ...docSlugs.map((slug) => `/docs/${slug}`), "/playground", "/coverage", "/activity"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${siteOrigin}/${locale}${path}`,
      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((language) => [
              language,
              `${siteOrigin}/${language}${path}`,
            ]),
          ),
          "x-default": `${siteOrigin}/en${path}`,
        },
      },
    })),
  );
}
