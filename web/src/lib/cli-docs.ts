import type { DocLocale, DocPage } from "@/lib/docs-content";

const install = "npm install --save-dev @osiris_balonga/persona-cli\nnpx persona --version\nnpx persona --help";
const generate = "npx persona people --count 1000 --limit 100 --seed demo --as-of 2026-11-12 --output fixtures/people.json";

export const cliDocs: Record<DocLocale, DocPage> = {
  fr: {
    title: "Installer le CLI",
    description: "Installez Persona depuis npm pour générer des fixtures JSON et préparer vos seeders.",
    sections: [
      { id: "install", title: "Installer dans un projet", paragraphs: ["Node.js 24 est requis. Ajoutez `@osiris_balonga/persona-cli` aux dépendances de développement, puis utilisez la commande `persona` avec `npx`. Aucune clé API n’est nécessaire."], code: { language: "bash", value: install } },
      { id: "global", title: "Installation globale", paragraphs: ["Pour utiliser `persona` directement dans votre terminal, installez le même paquet globalement."], code: { language: "bash", value: "npm install --global @osiris_balonga/persona-cli\npersona --help" } },
      { id: "export", title: "Générer un fichier JSON", paragraphs: ["`--count` indique le total (jusqu’à 10 000) et `--limit` la taille de chaque page (100 maximum). Le CLI suit les curseurs automatiquement. La graine et la date fixées permettent de rejouer les résultats tant que les versions de génération restent identiques."], code: { language: "bash", value: generate }, note: "Le fichier final est créé après réussite de toutes les pages. Un fichier existant est conservé sauf avec --force ; un échec préserve l’original même avec cette option. Sans --output, stdout contient uniquement le JSON ; les messages vont sur stderr." },
      { id: "api", title: "Choisir le serveur API", paragraphs: ["Le CLI construit depuis ce dépôt utilise l’entrée publique /api après la migration. Les versions déjà publiées peuvent conserver le staging Render ; choisissez explicitement le serveur avec --api-url. La pagination nécessite un déploiement compatible. Installer le CLI ne met pas à jour le serveur. Utilisez `--api-url` pour un autre déploiement ; cette option est prioritaire sur la variable `PERSONA_API_URL`."], code: { language: "bash", value: "npx persona people --api-url http://localhost:3000 --count 3" }, note: "Indiquez l’URL de base sans /people. Le CLI appelle une API HTTP ; il ne génère pas les personnes hors ligne. Sur 429, le mode paginé respecte Retry-After avec au plus trois nouvelles tentatives par page, pour un délai entier de 0 à 120 secondes." },
      { id: "seed", title: "Préparer un seeder", paragraphs: ["Inspectez la couverture embarquée ou créez un modèle de seeder à adapter. La couverture est un instantané lié à la version du CLI. Le modèle ne se connecte pas à votre base et ne modifie pas sa configuration."], code: { language: "bash", value: "npx persona countries --country CG\nnpx persona seed init --adapter prisma\n# Ou : npx persona seed init --adapter generic" }, note: "Adaptez le mapping et l’insertion avant d’exécuter le seeder. Les coordonnées sont des données de test : ne les contactez pas." },
    ],
  },
  en: {
    title: "Install the CLI",
    description: "Install Persona from npm to generate JSON fixtures and prepare seed scripts.",
    sections: [
      { id: "install", title: "Install in a project", paragraphs: ["Node.js 24 is required. Add `@osiris_balonga/persona-cli` as a development dependency, then run `persona` with `npx`. No API key is needed."], code: { language: "bash", value: install } },
      { id: "global", title: "Global installation", paragraphs: ["Install the same package globally to run `persona` directly in your terminal."], code: { language: "bash", value: "npm install --global @osiris_balonga/persona-cli\npersona --help" } },
      { id: "export", title: "Generate a JSON file", paragraphs: ["`--count` is the total (up to 10,000), and `--limit` is the page size (at most 100). The CLI follows cursors automatically. Fixed seed and date values allow replay while generation versions remain unchanged."], code: { language: "bash", value: generate }, note: "The final file is published after every page succeeds. Existing files are preserved unless --force is supplied; failures preserve the original even with that option. Without --output, stdout contains JSON only; messages go to stderr." },
      { id: "api", title: "Choose the API server", paragraphs: ["The CLI built from this repository uses the public /api entry after migration. Previously published versions may still use Render staging; select the server explicitly with --api-url. Pagination requires a compatible API deployment. Installing the CLI does not update the server. Use `--api-url` for another deployment; this option takes precedence over the `PERSONA_API_URL` environment variable."], code: { language: "bash", value: "npx persona people --api-url http://localhost:3000 --count 3" }, note: "Supply a base URL without /people. The CLI calls an HTTP API; it does not generate people offline. On 429, paginated mode respects Retry-After with at most three retries per page for integer delays from 0 to 120 seconds." },
      { id: "seed", title: "Prepare a seed script", paragraphs: ["Inspect bundled coverage or create a seed template to adapt. Coverage is a snapshot tied to the CLI version. The template does not connect to your database or change its configuration."], code: { language: "bash", value: "npx persona countries --country CG\nnpx persona seed init --adapter prisma\n# Or: npx persona seed init --adapter generic" }, note: "Adapt mapping and insertion before running the seed script. Generated contact details are test data; never contact them." },
    ],
  },
};
