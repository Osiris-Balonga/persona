import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DocsArticle } from "@/components/docs/docs-article";
import { docs } from "@/lib/docs-content";
import { requireLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const page = docs[locale].pages.quickstart;
  return localizedMetadata(locale, "/docs", page.title, page.description);
}

export default async function DocsPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  return <DocsArticle locale={locale} slug="quickstart" />;
}
