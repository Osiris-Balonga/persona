const entityTag = '(?:W/)?"[\\x21\\x23-\\x7e\\x80-\\xff]*"'
const validatorList = new RegExp(`^[ \\t]*(?:${entityTag})?(?:[ \\t]*,[ \\t]*(?:${entityTag})?)*[ \\t]*$`)

// RFC 9110 requires weak comparison for If-None-Match on GET and HEAD.
// Commas inside a quoted opaque tag are data, not list separators.
export function matchesIfNoneMatch(header: string | null | undefined, etag: string): boolean {
  if (header === undefined || header === null) return false
  if (/^[ \t]*\*[ \t]*$/.test(header)) return true
  if (!validatorList.test(header)) return false
  const opaqueTag = etag.startsWith('W/') ? etag.slice(2) : etag
  return Array.from(header.matchAll(/(?:W\/)?("[\x21\x23-\x7e\x80-\xff]*")/g))
    .some((match) => match[1] === opaqueTag)
}
