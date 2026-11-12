import { config } from "@/lib/config";
import type { DocLocale, DocPage } from "@/lib/docs-content";

const collectExample = `let url = new URL('${config.peopleUrl}');
url.search = new URLSearchParams({
  count: '1000', limit: '100', seed: 'bulk-demo', asOf: '2026-11-12',
}).toString();
const people = [];
while (url) {
  const response = await fetch(url);
  if (response.status === 429) {
    const delay = response.headers.get('Retry-After');
    if (!delay || !/^\\d+$/.test(delay)) throw new Error('Retry later');
    await new Promise(resolve => setTimeout(resolve, Number(delay) * 1000));
    continue;
  }
  if (!response.ok) throw new Error(\`Persona HTTP \${response.status}\`);
  const page = await response.json();
  people.push(...page.results);
  const cursor = page.meta.pagination.nextCursor;
  url = cursor === null ? null : new URL('${config.peopleUrl}');
  if (url) url.search = new URLSearchParams({ cursor }).toString();
}
console.log(people.length); // 1000`;

export const paginationDocs: Record<DocLocale, DocPage> = {
  fr: {
    title: "Pagination",
    description: "Récupérez jusqu’à 10 000 personnes par lot, avec au plus 100 résultats par page.",
    sections: [
      { id: "start", title: "Demander un lot", paragraphs: ["`count` indique le total souhaité (1–10 000, défaut 1). `limit` indique la taille maximale d’une page (1–100, défaut 100). L’API active la pagination si `count` dépasse 100 ou si `limit` est fourni, même pour un petit lot."], code: { language: "bash", value: `curl '${config.peopleUrl}?count=1000&limit=100&seed=bulk-demo&asOf=2026-11-12'` }, note: "Ces paramètres nécessitent un déploiement de l’API compatible avec la pagination. Une ancienne API peut les rejeter. Le Playground reste un aperçu de 1 à 100 personnes." },
      { id: "metadata", title: "Lire la page", paragraphs: ["`results` contient la page courante ; `meta.count` est le nombre de personnes de cette page. `meta.pagination` est présent uniquement en mode paginé. Les requêtes habituelles de 100 personnes ou moins, sans `limit`, conservent leur réponse habituelle."], table: { headers: ["Champ", "Sens"], rows: [
        ["meta.pagination.total", "Total demandé avec count"], ["meta.pagination.limit", "Taille maximale de cette page"], ["meta.pagination.offset", "Indice de départ, à partir de zéro"], ["meta.pagination.nextCursor", "Curseur de la page suivante ; null à la fin"],
      ] } },
      { id: "continue", title: "Suivre le curseur", paragraphs: ["Transmettez le `nextCursor` reçu dans `cursor`, avec `URLSearchParams` pour l’encodage. N’ajoutez aucun filtre, ni `count`, `seed` ou `asOf` : le curseur contient déjà l’état du lot. Seul `limit` peut être ajouté pour changer la taille de la prochaine page, sans changer la séquence des personnes."], code: { language: "js", value: collectExample }, note: "Les curseurs sont opaques pour le client. Un curseur mal formé, accompagné d’autres filtres ou incompatible après une mise à jour du serveur renvoie 400 INVALID_QUERY avec parameter: cursor. Recommencez alors le lot ; ne mélangez pas les versions." },
      { id: "replay", title: "Rejouer et reprendre", paragraphs: ["Le curseur fixe les filtres, la graine, la date UTC de référence et les versions de génération. Un passage à minuit ne change pas les pages suivantes. Sans `seed`, le premier appel paginé génère une graine et la renvoie dans `meta.seed` ; conservez-la avec `meta.asOf` pour rejouer le lot.", "Les identifiants sont distincts dans le lot. Les noms et portraits proviennent de collections finies et peuvent se répéter. Les pages reprennent la séquence par blocs fixes de 100 personnes, quelle que soit la valeur de `limit`."], note: "Une mise à jour des données, du catalogue de portraits ou de l’algorithme peut invalider un curseur. Chaque page a son propre ETag. Les continuations sont privées et revalidables ; le premier appel sans seed et asOf explicites reste no-store." },
      { id: "limits", title: "Respecter les limites", bullets: ["Chaque page compte comme une requête dans le quota de 30 requêtes par minute, par IP et par instance.", "Sur 429, attendez au moins Retry-After avant de redemander le même curseur. Ne relancez pas la première page.", "La limite de réponse de 256 Kio s’applique à chaque page. Sur 503 RESPONSE_TOO_LARGE, réduisez limit ou sélectionnez moins de champs dès la première requête.", "Requête initiale : 2 048 caractères encodés maximum. Continuation : 8 192 caractères, dont un curseur de 4 096 caractères maximum."] },
      { id: "cli", title: "Exporter avec le CLI", paragraphs: ["La version du CLI avec pagination suit les curseurs et assemble un seul objet JSON. `meta.count` indique alors le total exporté ; les métadonnées de page sont retirées. Avec `--output`, les pages sont écrites progressivement dans un fichier temporaire puis le fichier final est publié après réussite. Les messages vont sur stderr ; stdout reste du JSON."], code: { language: "bash", value: "persona people --count 1000 --limit 100 --seed bulk-demo --as-of 2026-11-12 --output fixtures/people.json" }, note: "Installation : npm install --save-dev @osiris_balonga/persona-cli (Node.js 24), puis utilisez npx persona. Consultez la page Installer le CLI. En mode paginé, il réessaie une page au plus trois fois sur 429 si Retry-After est un entier de 0 à 120 secondes. Un échec conserve le fichier existant, y compris avec --force." },
    ],
  },
  en: {
    title: "Pagination",
    description: "Retrieve up to 10,000 people per collection, with at most 100 results per page.",
    sections: [
      { id: "start", title: "Request a collection", paragraphs: ["`count` is the requested total (1–10,000, default 1). `limit` is the maximum page size (1–100, default 100). Pagination is enabled when `count` exceeds 100 or `limit` is provided, including for small collections."], code: { language: "bash", value: `curl '${config.peopleUrl}?count=1000&limit=100&seed=bulk-demo&asOf=2026-11-12'` }, note: "These parameters require an API deployment with pagination support. An older API may reject them. The Playground remains a preview of 1 to 100 people." },
      { id: "metadata", title: "Read a page", paragraphs: ["`results` holds the current page; `meta.count` is the number of people on that page. `meta.pagination` is only present in paginated mode. Existing requests for 100 people or fewer without `limit` keep their usual response."], table: { headers: ["Field", "Meaning"], rows: [
        ["meta.pagination.total", "Total requested with count"], ["meta.pagination.limit", "Maximum size of this page"], ["meta.pagination.offset", "Zero-based start index"], ["meta.pagination.nextCursor", "Next-page cursor; null at the end"],
      ] } },
      { id: "continue", title: "Follow the cursor", paragraphs: ["Pass the returned `nextCursor` as `cursor`, using `URLSearchParams` to encode it. Do not add filters, `count`, `seed` or `asOf`: the cursor carries the collection state. Only `limit` may be added to resize the next page without changing the sequence of people."], code: { language: "js", value: collectExample }, note: "Clients should treat cursors as opaque. A malformed cursor, extra filters or a cursor incompatible after a server update returns 400 INVALID_QUERY with parameter: cursor. Start a new collection instead of combining versions." },
      { id: "replay", title: "Replay and resume", paragraphs: ["The cursor fixes filters, seed, UTC reference date and generation versions. Crossing midnight does not change subsequent pages. Without `seed`, the first paginated request generates one and returns it in `meta.seed`; save it with `meta.asOf` to replay the collection.", "IDs are distinct within the collection. Names and portraits come from finite pools and may repeat. Pages follow fixed blocks of 100 people regardless of `limit`."], note: "Data, portrait catalog or algorithm updates may invalidate a cursor. Each page has its own ETag. Continuations are private and revalidatable; the first request without explicit seed and asOf remains no-store." },
      { id: "limits", title: "Respect service limits", bullets: ["Every page counts as one request toward the quota of 30 requests per minute per IP per instance.", "On 429, wait at least Retry-After before requesting the same cursor again. Do not restart from the first page.", "The 256 KiB response cap applies per page. On 503 RESPONSE_TOO_LARGE, reduce limit or select fewer fields in the initial request.", "Initial encoded query: at most 2,048 characters. Continuation: 8,192 characters, including a cursor of at most 4,096 characters."] },
      { id: "cli", title: "Export with the CLI", paragraphs: ["The pagination-capable CLI follows cursors and assembles a single JSON object. `meta.count` then holds the exported total; page metadata is removed. With `--output`, pages stream to a temporary file and the final file is published after success. Messages go to stderr; stdout stays JSON."], code: { language: "bash", value: "persona people --count 1000 --limit 100 --seed bulk-demo --as-of 2026-11-12 --output fixtures/people.json" }, note: "Install with npm install --save-dev @osiris_balonga/persona-cli (Node.js 24), then use npx persona. See the Install the CLI page. Paginated mode retries a page at most three times on 429 when Retry-After is an integer from 0 to 120 seconds. Failure preserves an existing file, including with --force." },
    ],
  },
};
