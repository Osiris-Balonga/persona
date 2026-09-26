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
  const primaryRange = `${metadata?.apparentAgeMin}-${metadata?.apparentAgeMax}`;
  const secondaryRange = `${metadata?.secondaryAgeMin}-${metadata?.secondaryAgeMax}`;
  const secondaryGroup = metadata?.secondaryAgeMin == null ? null
    : metadata.secondaryAgeMin <= 12 ? "child"
    : metadata.secondaryAgeMin <= 17 ? "teen"
    : metadata.secondaryAgeMin <= 64 ? "adult" : "senior";
  return (
    (filters.status === "all" || item.status === filters.status) &&
    (filters.appearance === "all" ||
      (metadata?.appearance ?? "unclassified") === filters.appearance) &&
    (filters.ageGroup === "all" || metadata?.ageGroup === filters.ageGroup || secondaryGroup === filters.ageGroup) &&
    (filters.ageRange === "all" ||
      primaryRange === filters.ageRange || secondaryRange === filters.ageRange) &&
    (filters.gender === "all" || metadata?.gender === filters.gender) &&
    (filters.quality === "all" ||
      isPortraitCompliant(item) === (filters.quality === "compliant"))
  );
}
