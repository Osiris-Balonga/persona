const officialNames: Record<string, Record<string, string>> = {
  en: {
    CG: "Republic of the Congo",
    CD: "Democratic Republic of the Congo",
  },
  fr: {
    CG: "République du Congo",
    CD: "République démocratique du Congo",
  },
};

export function countryDisplayName(code: string, locale: string, fallback?: string) {
  const official = officialNames[locale]?.[code];
  if (official) return official;
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? fallback ?? code; }
  catch { return fallback ?? code; }
}
