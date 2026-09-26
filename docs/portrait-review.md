# Portrait review and import

Only approved and explicitly released images enter the versioned production catalog. This procedure prepares and validates review metadata; publication is described in [private portrait delivery](portrait-delivery.md).

## Local review console

Run `npm run portraits:review` from the repository root and open `http://127.0.0.1:4317`. The console listens on the local loopback interface only. Upload one or more PNG, JPEG, or WebP masters with the import button, or place them in `staging/portraits/review/inbox/`; the running console scans that folder every five seconds. To import an existing directory without moving its originals, run `npm run portraits:import-review -- <image-directory>`.

Successful imports move an original to `masters/` and create a 512×512 WebP under `webp/`. An invalid original remains in `inbox/` with a processing error. The ignored `review-state.json` stores proposed metadata and review decisions, separately from the image folders. The console groups portraits by production region, displays technical properties in each image's review sheet, and offers five-year age intervals from 6 to 100, shortened where an interval meets an age-group boundary. An agent must inspect the image and enter the proposed age, category, visual compatibility tags, and retained rights evidence before its status becomes ready for human review. The reviewer may correct the proposed choices, approve, or reject with a reason. Several visual tags may be selected for one portrait. The tags and optional 1–10 [Monk skin-tone](https://skintone.google/) annotation are embedded as XMP in the optimized WebP; the review record remains the source of truth. Editing tags or tone after approval preserves the decision. Changing other reviewed characteristics returns the portrait to review. Approval in this local console never publishes a portrait or changes the production catalog.

## Human review rubric

The optional production collection records the generation brief and can be selected before import or corrected on an item. It is independent of visual compatibility tags and the public `appearance` filter. Current collections cover African and Asian regions, North America, Latin America and the Caribbean, Northern, Western, Southern, and Eastern Europe, and Australia/New Zealand and the Pacific islands. When the generation brief names only a continent, a finer regional assignment is an editorial estimate, not verified origin; record this distinction in review notes. Each regional batch targets 16 portraits: four children, four teenagers, four adults, and four seniors. Collection assignment alone does not approve an image.

Visual tags describe editorial reuse of a synthetic face across appearance contexts. They do not establish the person's ancestry, nationality, or country of residence. The current set is `black`, `european`, `north-african`, `middle-eastern`, `south-asian`, `east-asian`, `southeast-asian`, `pacific-islander`, and `indigenous-american`. Choose every plausible tag, but do not derive a tag solely from the production collection or the Monk value. The public `appearance` filter keeps its existing vocabulary; portrait selection maps that filter to these tags, except `mixed`, which keeps its separately reviewed compatibility. Multiple tags alone do not classify a portrait as mixed. Correcting tags changes the reviewed WebP hash, so the catalog must use the final hash.

Review each candidate at its intended display size and at full resolution. Record a named reviewer, UTC review date, and decision (`approved`, `rejected`, or `withdrawn`). A standard approval reason is sufficient after inspection; a rejection or withdrawal needs a specific reason. Approval requires every check below:

| Check | Approval rule |
| --- | --- |
| Visual quality | Face and crop are clear at thumbnail size; anatomy, lighting, and edges have no conspicuous artifacts. No watermark, logo, text, or identifying real-person likeness. |
| Age and category | The visible age range is plausible for the declared `ageGroup`; the reviewer can defend each visual compatibility tag. Country, name, or production lot never determines the tags. |
| Rights | `rights` identifies the permitted use and `rightsEvidence` points to a retained generation/license record. A missing or uncertain right is a rejection. |
| Metadata | ID, catalog version, age group, gender, visual tags, object key, and SHA-256 agree with the reviewed file. |
| File | Static WebP, exactly 512×512 pixels, fewer than 50,000 bytes, and decodes fully. |

Reject a candidate when any rule fails and record the reason. For a withdrawal, record why approval ended, remove the ID from the production catalog before denying it in the Worker, and follow the [global cache purge procedure](architecture.md#portrait-catalog). A rejected or withdrawn record is retained in the review log for traceability but never appears in an import proposal. Review records and rights evidence must be retained with the batch; avoid committing unreviewed image files to this repository.

## Import preparation

Run `npm run portraits:audit-review` against the local review directory before preparing a publication. It checks every approved source master, final WebP, embedded visual tags, import metadata, and catalog coverage. It reads local staging files and never writes to the manifest or R2. Set `PERSONA_REVIEW_ROOT` when staging lives outside the default directory.

Keep a JSON array of review records beside files named `<id>.webp` in a private staging directory. Each record contains the [catalog asset fields](../src/portraits/catalog.ts) plus `rightsEvidence`, `reviewer`, `reviewedAt` (`YYYY-MM-DD`), and `decisionReason`. Run:

```sh
npm run portraits:prepare -- /private/staging/batch.json https://images.example.test
```

Replace the example URL with the planned HTTPS Worker base. The command requires reviewed visual tags and verifies metadata, IDs, duplicate hashes, file size, WebP format, dimensions, frame count, full decoding, and the declared SHA-256. It prints an approved-only catalog proposal when the entire batch is valid and exits nonzero on any error. It neither edits the production manifest nor uploads to R2. Preserve the source review log and its rights evidence with the reviewed batch. A later publication step must add only the approved proposal to the versioned manifest and then verify the private Worker serves exactly those IDs.

To prepare generated PNG masters for review, run `npm run portraits:optimize -- <candidate-directory>`. The command preserves the masters, writes 512×512 WebP candidates at quality 88 under `<candidate-directory>/webp/`, and rejects any output at or above 50,000 bytes. It rejects non-square or undersized masters rather than silently cropping or enlarging a face. Its `webp/manifest.json` records byte sizes and hashes; all outputs remain unreviewed. Repeating the command accepts identical outputs and refuses to overwrite a changed candidate.

The one-pixel test fixture is a non-portrait file used solely to verify that undersized images are rejected. The checked-in [production manifest](../src/portraits/manifest.ts) lists the published approved assets.
