export const skinToneSwatches = [
  { value: 1, color: "#f7ede4" },
  { value: 2, color: "#f3e7da" },
  { value: 3, color: "#f6ead0" },
  { value: 4, color: "#ead9bb" },
  { value: 5, color: "#d7bd96" },
  { value: 6, color: "#9f7d54" },
  { value: 7, color: "#815d44" },
  { value: 8, color: "#604234" },
  { value: 9, color: "#3a312a" },
  { value: 10, color: "#2a2420" },
] as const;

export function getSkinToneSwatch(value: number) {
  return skinToneSwatches.find((swatch) => swatch.value === value);
}

export type SkinToneSelection = number | readonly number[] | null;

export function selectedSkinTones(selected: SkinToneSelection): readonly number[] {
  return selected === null ? skinToneSwatches.map(({ value }) => value)
    : typeof selected === "number" ? [selected] : selected;
}

export function toggleSkinTone(selected: SkinToneSelection, value: number): SkinToneSelection {
  const tones = selectedSkinTones(selected);
  const next = tones.includes(value) ? tones.filter(tone => tone !== value) : [...tones, value];
  const ordered = next.toSorted((a, b) => a - b);
  return ordered.length === 10 ? null : ordered.length === 1 ? ordered[0] : ordered;
}

export function toggleAllSkinTones(selected: SkinToneSelection): SkinToneSelection {
  return selectedSkinTones(selected).length === skinToneSwatches.length ? [] : null;
}
