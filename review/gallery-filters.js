import { regionMatches } from "./gallery-regions.js";

export function isPortraitCompliant(item) {
  const file = item.technical;
  return Boolean(
    file &&
      file.format === "webp" &&
      file.width === 512 &&
      file.height === 512 &&
      file.pages === 1 &&
      file.bytes > 0 &&
      file.bytes < 50_000,
  );
}

export function matchesPortraitFilters(item, filters) {
  const metadata = item.metadata;
  const ranges = metadata?.apparentAgeRanges ?? [
    [metadata?.apparentAgeMin, metadata?.apparentAgeMax],
    ...(metadata?.secondaryAgeMin == null ? [] : [[metadata.secondaryAgeMin, metadata.secondaryAgeMax]]),
  ];
  const groupForAge = (age) => age <= 12 ? "child" : age <= 17 ? "teen" : age <= 64 ? "adult" : "senior";
  return (
    (filters.status === "all" || item.status === filters.status) &&
    regionMatches(item, filters.region) &&
    (!filters.appearance || filters.appearance === "all" ||
      (metadata?.appearance ?? "unclassified") === filters.appearance) &&
    (!filters.collection || filters.collection === "all" ||
      (item.collection ?? "unassigned") === filters.collection) &&
    (filters.ageGroup === "all" || ranges.some(([min]) => Number.isInteger(min) && groupForAge(min) === filters.ageGroup)) &&
    (filters.ageRange === "all" ||
      ranges.some(([min, max]) => `${min}-${max}` === filters.ageRange)) &&
    (filters.gender === "all" || metadata?.gender === filters.gender) &&
    (filters.quality === "all" ||
      isPortraitCompliant(item) === (filters.quality === "compliant"))
  );
}
