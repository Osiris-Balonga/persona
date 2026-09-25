# Portrait review and import

The production catalog remains empty until image generation is explicitly authorized and each image is reviewed. This procedure prepares metadata and validates files; it does not generate, upload, or publish portraits.

## Human review rubric

Review each candidate at its intended display size and at full resolution. Record a named reviewer, UTC review date, decision (`approved`, `rejected`, or `withdrawn`), and a specific reason. Approval requires every check below:

| Check | Approval rule |
| --- | --- |
| Visual quality | Face and crop are clear at thumbnail size; anatomy, lighting, and edges have no conspicuous artifacts. No watermark, logo, text, or identifying real-person likeness. |
| Age and category | The visible age range is plausible for the declared `ageGroup`; the reviewer can defend the broad visual `appearance` category and `visualGroup`. Country or name never determines the visual category. |
| Rights | `rights` identifies the permitted use and `rightsEvidence` points to a retained generation/license record. A missing or uncertain right is a rejection. |
| Metadata | ID, catalog version, age group, gender, visual group, appearance, object key, and SHA-256 agree with the reviewed file. |
| File | Static WebP, exactly 512×512 pixels, fewer than 50,000 bytes, and decodes fully. |

Reject a candidate when any rule fails and record the reason. For a withdrawal, record why approval ended, remove the ID from the production catalog before denying it in the Worker, and follow the [global cache purge procedure](architecture.md#portrait-catalog). A rejected or withdrawn record is retained in the review log for traceability but never appears in an import proposal. Review records and rights evidence must be retained with the batch; avoid committing unreviewed image files to this repository.

## Import preparation

Keep a JSON array of review records beside files named `<id>.webp` in a private staging directory. Each record contains the [catalog asset fields](../src/portraits/catalog.ts) plus `rightsEvidence`, `reviewer`, `reviewedAt` (`YYYY-MM-DD`), and `decisionReason`. Run:

```sh
npm run portraits:prepare -- /private/staging/batch.json https://images.example.test
```

Replace the example URL with the planned HTTPS Worker base. The command verifies metadata, IDs, duplicate hashes, file size, WebP format, dimensions, frame count, full decoding, and the declared SHA-256. It prints an approved-only catalog proposal when the entire batch is valid and exits nonzero on any error. It neither edits the production manifest nor uploads to R2. Preserve the source review log and its rights evidence with the reviewed batch. A later publication step must add only the approved proposal to the versioned manifest and then verify the private Worker serves exactly those IDs.

The one-pixel test fixture is a non-portrait file used solely to verify that undersized images are rejected. The checked-in [production manifest](../src/portraits/manifest.ts) contains no assets.
