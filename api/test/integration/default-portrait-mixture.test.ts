import { expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { portraitCatalog } from '../../src/portraits/manifest.js'

it('uses the same released mixture for omitted filters and all Playground checkboxes', async () => {
  const app = buildApp({ rateLimitMax: 100 })
  try {
    const url = '/people?count=100&nationality=CG&ageGroup=adult&seed=weighted-default&asOf=2026-10-11'
    const implicit = await app.inject(url)
    const explicit = await app.inject(url + '&portraitContexts=standard,doctor,construction,business,school-pupil')
    expect(implicit.statusCode).toBe(200)
    expect(implicit.json().meta.portraitContexts).toEqual(['standard', 'doctor', 'construction', 'business', 'school-pupil'])
    expect(implicit.body).toBe(explicit.body)
    expect(implicit.headers.etag).toBe(explicit.headers.etag)
    const types = implicit.json().results.map((p: { picture: {large: string} }) => {
      const id = p.picture.large.split('/').at(-1)!.replace('.webp', '')
      return portraitCatalog.assets.find(a => a.id === id)!.portraitContext ?? 'standard'
    })
    expect(new Set(types)).toEqual(new Set(['standard', 'doctor', 'construction', 'business']))
    const standard = await app.inject(url + '&portraitContext=standard')
    expect(standard.json().meta.portraitContext).toBe('standard')
    expect(standard.headers.etag).not.toBe(implicit.headers.etag)
    for (const p of standard.json().results) {
      const id = p.picture.large.split('/').at(-1).replace('.webp', '')
      expect(portraitCatalog.assets.find(a => a.id === id)!.portraitContext ?? 'standard').toBe('standard')
    }
  } finally { await app.close() }
})
