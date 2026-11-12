export type PortraitImageVariants = {
  medium?: string | null;
  large?: string | null;
  thumbnail?: string | null;
} | null | undefined;

export function portraitImageForSize(picture: PortraitImageVariants, size: "card" | "thumbnail"): string | null {
  if (!picture) return null;
  const candidates = size === "card"
    ? [picture.large, picture.medium, picture.thumbnail]
    : [picture.thumbnail, picture.medium, picture.large];
  return candidates.find((url): url is string => typeof url === "string" && url.length > 0) ?? null;
}
