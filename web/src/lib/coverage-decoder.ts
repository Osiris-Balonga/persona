export type CoverageStatus = "available" | "pending-name-review" | "unavailable";
export type PhoneStatus = "reserved-range" | "format-valid" | "unavailable" | "not-applicable";

export type CoverageRow = {
  code: string;
  name: string;
  status: CoverageStatus;
  postcodeCities: number;
  sampledCities: number;
  phone: PhoneStatus;
  continent: string | null;
  subregion: string | null;
};

export type CoveragePayload = {
  meta: { dataVersion: string; catalogVersion: string; portraitSelectionVersion: string };
  countries: CoverageRow[];
  portraits: {
    total: number;
    annotatedSkinTone: number;
    contexts: { id: string; minAge: number; maxAge: number; count: number; weight: number }[];
    skinTones: { value: number; count: number }[];
  };
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function nullableM49Code(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && /^\d{3}$/.test(value));
}

export function decodeCoveragePayload(value: unknown): CoveragePayload {
  if (!record(value) || !record(value.meta) || !record(value.portraits) || !Array.isArray(value.countries)) {
    throw new Error("Invalid coverage payload shape");
  }
  const { meta, portraits } = value;
  if (!nonEmptyString(meta.dataVersion) || !nonEmptyString(meta.catalogVersion) || !nonEmptyString(meta.portraitSelectionVersion)) {
    throw new Error("Invalid coverage versions");
  }
  const countries = value.countries.map((item): CoverageRow => {
    if (!record(item)
      || !/^[A-Z]{2}$/.test(String(item.code))
      || !nonEmptyString(item.name)
      || !["available", "pending-name-review", "unavailable"].includes(String(item.status))
      || !nonNegativeInteger(item.sampledCities)
      || !nonNegativeInteger(item.postcodeCities)
      || !["reserved-range", "format-valid", "unavailable", "not-applicable"].includes(String(item.phone))
      || !nullableM49Code(item.continent)
      || !nullableM49Code(item.subregion)
      || (item.postcodeCities as number) > (item.sampledCities as number)) {
      throw new Error("Invalid country coverage row");
    }
    return item as CoverageRow;
  });
  if (countries.length === 0 || new Set(countries.map((country) => country.code)).size !== countries.length) {
    throw new Error("Coverage countries are empty or duplicated");
  }
  const portraitTotal = portraits.total;
  const annotatedSkinTone = portraits.annotatedSkinTone;
  if (!nonNegativeInteger(portraitTotal)
    || !nonNegativeInteger(annotatedSkinTone) || annotatedSkinTone > portraitTotal
    || !Array.isArray(portraits.contexts) || !Array.isArray(portraits.skinTones)) {
    throw new Error("Invalid portrait summary");
  }
  const contexts = portraits.contexts.map((item) => {
    if (!record(item) || !nonEmptyString(item.id)
      || !nonNegativeInteger(item.minAge) || !nonNegativeInteger(item.maxAge) || item.maxAge < item.minAge
      || !nonNegativeInteger(item.count) || item.count > portraitTotal || !nonNegativeInteger(item.weight)) {
      throw new Error("Invalid portrait context");
    }
    return item as CoveragePayload["portraits"]["contexts"][number];
  });
  const skinTones = portraits.skinTones.map((item) => {
    if (!record(item) || !Number.isSafeInteger(item.value) || (item.value as number) < 1 || (item.value as number) > 10
      || !nonNegativeInteger(item.count) || item.count > annotatedSkinTone) {
      throw new Error("Invalid portrait skin tone summary");
    }
    return item as CoveragePayload["portraits"]["skinTones"][number];
  });
  if (new Set(contexts.map((context) => context.id)).size !== contexts.length
    || new Set(skinTones.map((tone) => tone.value)).size !== skinTones.length
    || skinTones.reduce((sum, tone) => sum + tone.count, 0) !== annotatedSkinTone) {
    throw new Error("Inconsistent portrait summary counts");
  }
  return {
    meta: { dataVersion: meta.dataVersion, catalogVersion: meta.catalogVersion, portraitSelectionVersion: meta.portraitSelectionVersion },
    countries,
    portraits: { total: portraitTotal, annotatedSkinTone, contexts, skinTones },
  };
}
