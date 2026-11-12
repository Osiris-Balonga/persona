import { matchesPortraitFilters } from './gallery-filters.js'

export function eligibleReviewIds(items, filters) {
  return items
    .filter((item) => item.status === 'ready-for-review'
      && matchesPortraitFilters(item, { ...filters, status: 'all' }))
    .map((item) => item.id)
}

export function selectableAgeIndexes(ranges, selectedRanges) {
  if (selectedRanges.length === 0) return ranges.map((_, index) => index)
  const selected = selectedRanges
    .map(([min, max]) => ranges.findIndex(([start, end]) => min === start && max === end))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)
  if (selected.length === 0) return ranges.map((_, index) => index)
  const first = selected[0]
  const last = selected.at(-1)
  return ranges.flatMap((_, index) =>
    [first - 1, first, last, last + 1].includes(index) ? [index] : [])
}

export function nextPendingIndex(ids, items, currentIndex) {
  const ready = (id) => items.find((item) => item.id === id)?.status === 'ready-for-review'
  const next = ids.findIndex((id, index) => index > currentIndex && ready(id))
  if (next >= 0) return next
  const first = ids.findIndex(ready)
  return first >= 0 ? first : ids.length
}
