import { apiEndpoints } from "./api-url.ts";

export type PlaygroundOptions = {
  count: number;
  gender: "" | "female" | "male";
  ageGroups: (typeof playgroundAgeGroups)[number][];
  continent: string;
  nationality: string;
  residenceCountry: string;
  city: string;
  emailDomain: string;
  seed: string;
  asOf: string;
  fields: string[];
  portraitContexts: PlaygroundPortraitContext[];
  skinTone: number | readonly number[] | null;
  ageGroupsAdjustedByEligibility: boolean;
};

export const playgroundPortraitContexts = [
  "standard", "doctor", "construction", "business", "school-pupil",
] as const;
export type PlaygroundPortraitContext = (typeof playgroundPortraitContexts)[number];

export function togglePortraitContext(
  selected: readonly PlaygroundPortraitContext[],
  context: PlaygroundPortraitContext,
): PlaygroundPortraitContext[] {
  const next = new Set(selected);
  if (next.has(context)) next.delete(context);
  else next.add(context);
  return playgroundPortraitContexts.filter((item) => next.has(item));
}

export const defaultPlaygroundOptions: PlaygroundOptions = {
  count: 3,
  gender: "",
  ageGroups: ["child", "teen", "adult", "senior"],
  continent: "",
  nationality: "",
  residenceCountry: "",
  city: "",
  emailDomain: "example.test",
  seed: "",
  asOf: "",
  fields: [],
  portraitContexts: [...playgroundPortraitContexts],
  skinTone: null,
  ageGroupsAdjustedByEligibility: false,
};

export type QueryProblem =
  | "count"
  | "ageGroup"
  | "residenceNationality"
  | "city"
  | "nationality"
  | "emailDomain"
  | "seed"
  | "asOf"
  | "skinTone"
  | "url";

export const continentCodes: Record<string, string> = {
  africa: "002",
  americas: "019",
  asia: "142",
  europe: "150",
  oceania: "009",
};

export const playgroundAgeGroups = [
  "child",
  "teen",
  "adult",
  "senior",
] as const;

const portraitAgeEligibility: Record<PlaygroundPortraitContext, readonly string[]> = {
  standard: playgroundAgeGroups,
  doctor: ["adult"],
  construction: ["adult"],
  business: ["adult"],
  "school-pupil": ["child", "teen"],
};

export function eligiblePlaygroundAgeGroups(
  contexts: readonly PlaygroundPortraitContext[],
): (typeof playgroundAgeGroups)[number][] {
  if (contexts.length === 0) return [...playgroundAgeGroups];
  const eligible = new Set(contexts.flatMap((context) => portraitAgeEligibility[context]));
  return playgroundAgeGroups.filter((group) => eligible.has(group));
}

export function trimPlaygroundAgeGroups(
  selected: readonly (typeof playgroundAgeGroups)[number][],
  contexts: readonly PlaygroundPortraitContext[],
) {
  const eligible = eligiblePlaygroundAgeGroups(contexts);
  const compatible = selected.filter((group) => eligible.includes(group));
  return {
    ageGroups: compatible.length ? compatible : [...eligible],
    removed: selected.filter((group) => !eligible.includes(group)),
  };
}
export const playgroundFields = [
  "id",
  "gender",
  "name",
  "nationality",
  "dob",
  "location",
  "email",
  "phone",
  "picture",
  "login",
] as const;

const optionKeys = [
  "count",
  "gender",
  "ageGroup",
  "continent",
  "nationality",
  "residenceCountry",
  "city",
  "emailDomain",
  "seed",
  "asOf",
  "fields",
  "portraitContext",
  "portraitContexts",
  "skinTone",
] as const;

export function parsePlaygroundOptions(
  params: Pick<URLSearchParams, "get">,
): PlaygroundOptions {
  const count = Number(params.get("count"));
  const gender = params.get("gender");
  const continent = params.get("continent") ?? "";
  const ageGroupValue = params.get("ageGroup");
  const parsedAgeGroups = (ageGroupValue ?? "")
    .split(",")
    .filter((group) =>
      playgroundAgeGroups.includes(
        group as (typeof playgroundAgeGroups)[number],
      ),
    ) as (typeof playgroundAgeGroups)[number][];
  const parsedAgeSelection: PlaygroundOptions["ageGroups"] = parsedAgeGroups.length
    ? [...new Set(parsedAgeGroups)]
    : [...defaultPlaygroundOptions.ageGroups];
  const portraitContexts = params.get("portraitContexts");
  const selectedPortraitContexts = portraitContexts === null
    ? [...playgroundPortraitContexts]
    : playgroundPortraitContexts.filter((context) => portraitContexts.split(",").includes(context));
  const trimmedAgeSelection = trimPlaygroundAgeGroups(parsedAgeSelection, selectedPortraitContexts);
  const ageGroups = trimmedAgeSelection.ageGroups;
  const skinToneParam = params.get("skinTone");
  const skinToneValues = skinToneParam?.split(",").map(Number).toSorted((a, b) => a - b) ?? [];
  const validSkinTones = skinToneValues.length > 0 && skinToneValues.length <= 10
    && skinToneValues.every(tone => Number.isInteger(tone) && tone >= 1 && tone <= 10)
    && new Set(skinToneValues).size === skinToneValues.length;
  const fields = (params.get("fields") ?? "")
    .split(",")
    .filter((field) =>
      playgroundFields.includes(field as (typeof playgroundFields)[number]),
    );
  return {
    count:
      params.get("count") !== null && Number.isFinite(count)
        ? count
        : defaultPlaygroundOptions.count,
    gender: gender === "female" || gender === "male" ? gender : "",
    ageGroups,
    continent: continent in continentCodes ? continent : "",
    nationality: (params.get("nationality") ?? "").toUpperCase(),
    residenceCountry: (params.get("residenceCountry") ?? "").toUpperCase(),
    city: params.get("city") ?? "",
    emailDomain:
      params.get("emailDomain") ?? defaultPlaygroundOptions.emailDomain,
    seed: params.get("seed") ?? defaultPlaygroundOptions.seed,
    asOf: params.get("asOf") ?? "",
    fields: [...new Set(fields)],
    portraitContexts: selectedPortraitContexts,
    skinTone: skinToneParam === "" ? [] : validSkinTones ? skinToneValues.length === 1 ? skinToneValues[0] : skinToneValues : null,
    ageGroupsAdjustedByEligibility: trimmedAgeSelection.removed.length > 0,
  };
}

export function buildPlaygroundPageUrl(
  currentUrl: string,
  options: PlaygroundOptions,
): string {
  const url = new URL(currentUrl);
  const query = url.searchParams;
  for (const key of optionKeys) query.delete(key);
  if (options.count !== defaultPlaygroundOptions.count)
    query.set("count", String(options.count));
  if (options.gender) query.set("gender", options.gender);
  if (options.ageGroups.length > 0 && options.ageGroups.length < playgroundAgeGroups.length)
    query.set("ageGroup", options.ageGroups.join(","));
  if (options.continent) query.set("continent", options.continent);
  if (options.nationality) query.set("nationality", options.nationality);
  if (options.residenceCountry)
    query.set("residenceCountry", options.residenceCountry);
  if (options.city) query.set("city", options.city);
  if (options.emailDomain !== defaultPlaygroundOptions.emailDomain)
    query.set("emailDomain", options.emailDomain);
  if (options.seed.trim())
    query.set("seed", options.seed);
  if (options.asOf) query.set("asOf", options.asOf);
  if (options.fields.length) query.set("fields", options.fields.join(","));
  if (options.portraitContexts.length !== playgroundPortraitContexts.length)
    query.set("portraitContexts", options.portraitContexts.join(","));
  if (options.skinTone !== null) query.set("skinTone", String(options.skinTone));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function validatePlaygroundOptions(
  options: PlaygroundOptions,
  nationalityContinent?: string | null,
  residenceNeedsNationality = false,
): QueryProblem | null {
  if (
    !Number.isInteger(options.count) ||
    options.count < 1 ||
    options.count > 100
  )
    return "count";
  if (options.portraitContexts.length > 0 && options.ageGroups.length === 0)
    return "ageGroup";
  const eligibleAges = eligiblePlaygroundAgeGroups(options.portraitContexts);
  if (options.ageGroups.some((group) => !eligibleAges.includes(group))) return "ageGroup";
  if (residenceNeedsNationality && options.residenceCountry && !options.nationality && !options.continent)
    return "residenceNationality";
  if (options.city.trim() && !options.residenceCountry && !options.nationality)
    return "city";
  if (
    options.continent &&
    options.nationality &&
    nationalityContinent !== continentCodes[options.continent]
  )
    return "nationality";
  const emailDomain = options.emailDomain.trim().toLowerCase();
  if (emailDomain && (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(emailDomain)
    || emailDomain.length > 253
    || emailDomain.split(".").some((part) => part.length > 63 || part.startsWith("-") || part.endsWith("-"))
    || !/^[a-z]{2,63}$/.test(emailDomain.slice(emailDomain.lastIndexOf(".") + 1))))
    return "emailDomain";
  if (options.city.trim().length > 100) return "city";
  if (options.seed.trim().length > 128) return "seed";
  if (options.asOf && !isValidAsOfDate(options.asOf)) return "asOf";
  if (options.skinTone !== null) {
    const tones = typeof options.skinTone === "number" ? [options.skinTone] : options.skinTone;
    if (tones.length > 10 || new Set(tones).size !== tones.length
      || tones.some(tone => !Number.isInteger(tone) || tone < 1 || tone > 10)) return "skinTone";
  }
  return null;
}

export function isValidAsOfDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 102 || year > 9999 || month < 1 || month > 12) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function buildPeopleUrl(
  apiOrigin: string,
  options: PlaygroundOptions,
  portraitContextsEnabled = false,
): URL {
  const url = new URL(apiEndpoints(apiOrigin).people);
  const query = url.searchParams;
  query.set("count", String(options.count));
  if (options.gender) query.set("gender", options.gender);
  if (options.ageGroups.length < playgroundAgeGroups.length)
    query.set("ageGroup", options.ageGroups.join(","));
  if (options.continent) query.set("continent", options.continent);
  if (options.nationality) query.set("nationality", options.nationality);
  if (options.residenceCountry)
    query.set("residenceCountry", options.residenceCountry);
  if (options.city.trim()) query.set("city", options.city.trim());
  if (options.emailDomain.trim())
    query.set("emailDomain", options.emailDomain.trim().toLowerCase());
  if (options.seed.trim()) query.set("seed", options.seed.trim());
  if (options.asOf) query.set("asOf", options.asOf);
  if (options.fields.length) query.set("fields", options.fields.join(","));
  if (portraitContextsEnabled)
    query.set("portraitContexts", options.portraitContexts.join(","));
  if (portraitContextsEnabled && options.portraitContexts.length > 0 && options.skinTone !== null)
    query.set("skinTone", String(options.skinTone));
  return url;
}
