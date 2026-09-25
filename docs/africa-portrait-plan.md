# Africa portrait pilot

The first ten candidate portraits are stored locally in `staging/portraits/africa-pilot/` with a SHA-256 inventory in `candidates.json`. They are unreviewed PNG masters and are not in the production catalog. The first pilot samples all four age groups and six proposed shared reference pools; it is a visual check, not coverage of all age, gender, and pool combinations.

| Reference pool | Purpose and possible overlap |
| --- | --- |
| West and Central Africa | Shared pool for countries including CG, CD, and GA, with other pools allowed where appropriate |
| Sahel | Additional shared variation across portions of West and Central Africa |
| North Africa | Varied references across the Maghreb and neighboring areas |
| Horn and East Africa | Shared references across eastern regions, with overlap allowed |
| Southern Africa | Diverse references across southern regions |
| Indian Ocean | Diverse references for Madagascar and nearby islands; can overlap eastern and other pools |

These are editorial sourcing pools, not claims that a country has one physical type. A portrait may be tagged for multiple pools and stored once. An explicit appearance request should remain possible independently of a country. Default country-to-pool routing should be reviewed before production and must not be presented as population statistics. Human phenotypic variation is continuous and cannot be inferred reliably from nationality alone ([AABA](https://bioanth.org/about/aaba-statement-on-race-racism/)); Madagascar also has heterogeneous African and Austronesian ancestry across the island ([Pierron et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC5559028/)).

The candidate style is a centered, straight-on head-and-shoulders portrait with simple clothing, plain background, even daylight, and natural skin texture. Each candidate must be reviewed for visual quality, age, visible diversity, likeness risk, and rights before approval. The API's import contract additionally requires a static 512×512 WebP below 50,000 bytes and the review metadata described in [portrait-review.md](portrait-review.md). The PNG masters are 1254×1254. `npm run portraits:optimize -- staging/portraits/africa-pilot` creates the checked-in-format WebP candidates in the ignored `webp/` subfolder without replacing the masters. All ten are 512×512, weigh 19,764–35,136 bytes, and have hashes in `webp/manifest.json`. No candidate is published or returned by `/people`.

Google's [image delivery guidance](https://developer.chrome.com/docs/performance/insights/image-delivery) recommends appropriately sized images and efficient formats rather than one universal byte cap. The 50,000-byte limit is this project's delivery budget, and its success still requires visual review at thumbnail and full resolution. WebP is supported broadly and offers efficient lossy encoding for photographs ([Google WebP overview](https://developers.google.com/speed/webp)).

For a minimal catalog, each age × gender × pool combination needs two approved candidates. Six pools yield 96 nominal placements (6 × 4 × 2 × 2); ten per combination yield 480 placements. Multi-pool tagging could reduce the number of distinct images, but the actual total depends on review and coverage. The first ten images are for validating the style and pool design before scaling either target.
