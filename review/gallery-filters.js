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
  return (
    (filters.status === "all" || item.status === filters.status) &&
    (filters.appearance === "all" ||
      (metadata?.appearance ?? "unclassified") === filters.appearance) &&
    (filters.ageGroup === "all" || metadata?.ageGroup === filters.ageGroup) &&
    (filters.ageRange === "all" ||
      `${metadata?.apparentAgeMin}-${metadata?.apparentAgeMax}` ===
        filters.ageRange) &&
    (filters.gender === "all" || metadata?.gender === filters.gender) &&
    (filters.quality === "all" ||
      isPortraitCompliant(item) === (filters.quality === "compliant"))
  );
}
