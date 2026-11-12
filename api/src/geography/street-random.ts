export function drawStreet(key: string, salt: string, range: number): number {
  let hash = 2166136261
  for (const character of `${salt}:${key}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d) >>> 0
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b) >>> 0
  hash = (hash ^ (hash >>> 16)) >>> 0
  return hash % range
}
