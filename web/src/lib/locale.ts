import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function requireLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}
