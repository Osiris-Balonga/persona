import type { PortraitImageVariants } from "./portrait-image";

type HasPortrait = { picture: PortraitImageVariants };

export function featuredPersonWithPortrait<T extends HasPortrait>(people: readonly T[]): T | null {
  return people.find(({ picture }) => {
    if (!picture) return false;
    return [picture.large, picture.medium, picture.thumbnail]
      .some((url) => typeof url === "string" && url.length > 0);
  }) ?? null;
}
