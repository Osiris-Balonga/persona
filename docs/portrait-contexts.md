# Portrait contexts

`portraitContext` is a visual production brief, independent of geographical collection or appearance tags. It does not verify a person's profession, qualification or school. The API defaults to `standard`.

| Context | Editorial age eligibility | Visual brief |
| --- | --- | --- |
| `standard` | 6–100 | Everyday clothing |
| `doctor` | 25–64 | Medical coat and accessories |
| `construction` | 18–64 | Practical workwear, with varied helmet use |
| `business` | 18–64 | Formal business clothing |
| `school-pupil` | 6–17 | School clothing or accessories |
| `university-student` | 18–34 | University study clothing or accessories |

These are editorial limits for the initial contextual catalogue, not legal qualifications or retirement rules. Without `ageGroup`, generation chooses an eligible age. An explicit group list is intersected with eligibility; an empty intersection returns HTTP 400 with `CONFLICTING_FILTERS` and parameter `ageGroup`. A doctor request with `child,adult` uses ages 25–64; `doctor` with `child` or `senior` is invalid. Unknown and repeated contexts are rejected.

```text
GET /people?nationality=CG&portraitContext=doctor&ageGroup=adult&seed=doctor-demo&asOf=2026-10-06
```

Selection requires approval, requested context, geographical production collection, gender and exact reviewed apparent-age compatibility. It avoids repeated portraits while unused matching choices remain. Valid requests without an approved match return `picture: null`, without substituting another context or changing explicit filters. The catalog contains 1,764 `standard` portraits and 684 `doctor` portraits across all 19 production collections. Each doctor collection has 36 portraits: two per gender per eligible five-year review band from 25 to 64. The catalogue also contains 760 `construction` portraits, 40 per collection: two per gender per five-year adult band from 18 to 64. Business, school-pupil and university-student have no approved coverage yet.

## Review and compatibility

`PortraitAsset.portraitContext` and local review metadata use the shared typed registry. Older records lacking this field are interpreted as `standard`; explicit unknown or null contexts are invalid. Export adds explicit context classification without rewriting old images, decisions, hashes or rights evidence. Editing a new portrait's explicit context through the existing metadata endpoint embeds it in XMP and requires review again; do not reprocess approved historical files simply to classify them.

Reviewed age ranges retain the existing consecutive five-year bands. Every band must overlap context eligibility. Delivery applies the intersection: a doctor's reviewed 23–27 band can supply ages 25–27 only, and a fully disjoint 18–22 band is rejected. Coverage must report this effective intersection, not claim the entire editorial age range from a few candidates. The review interface and contextual coverage reporting are separate work in issue #195.

The local review editor stores an explicit context, filters the gallery by context, and serves an approved-only coverage matrix at `GET /api/coverage`. Each row groups collection, context and gender; age-band counts show effective intersections with context eligibility and include empty combinations. Older records without context are counted as `standard`. Candidates, rejected records and extracted or generated source counts do not represent approved coverage.

The catalogue's storage version remains `v1` to preserve all object keys and rendition URLs. Its selection revision is `contexts-v1`. The original standard classification required no image upload. New contextual batches require owner or explicitly delegated approval, import checks, publication and live verification; the named reviewer and retained authorization distinguish delegated decisions from independent human inspection.

## Replay and response metadata

Current responses include `meta.portraitContext` and `meta.portraitSelectionVersion`. These fields are optional in the v2 schemas for older fixtures/clients but emitted by the current generator, including partial field projections. Picture URLs retain the existing large/medium/thumbnail shape.

Identity derivation remains `v5`. Standard generation retains its existing component keys and person/portrait values; the two metadata fields change its response body and therefore its ETag. Nonstandard contexts scope the age and portrait keys by context and selection revision while retaining unrelated identity, geography and contact components for otherwise identical filters. Birthdays are recalculated for eligible ages. Context and selection revision participate in response validators; a standard ETag cannot return 304 for a doctor representation. Explicit `standard` and the omitted default share a validator. Store filters, seed, reference date, data/catalogue versions and selection revision when retaining replay instructions.

## Source sheet production

Square 2×2 source sheets contain four distinct individuals. On 2026-10-06 the owner authorized agents to generate the African batches directly; supplied sheets follow the same extraction and review boundary. Retain the exact generation prompt, generator, generation date, original source and source hash. Check identity diversity across sheets as well as within each sheet; different file hashes do not prove different faces. Generation does not confer human approval or publish a portrait.

The brief names each tile's TL/TR/BL/BR quadrant, portrait ID, context, gender, and intended age; metadata is never inferred from position. Require an even source at least 1024×1024 pixels without gutters or enlargement; 2048×2048 is preferred. Keep the source and unreviewed output outside Git. Run `npm run portraits:extract-sheet -- <source-image> <sheet-brief.json> <output-directory>` to create exact square crops and traceable sheet/tile manifests. Split each sheet before import, preserve its source and provenance, and review each individual separately. The pilot is tracked in #201.
