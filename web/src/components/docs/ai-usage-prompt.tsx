import { countryDisplayName } from "@/lib/country-display-name";
import { config } from "@/lib/config";
import type { DocLocale } from "@/lib/docs-content";
import { CodeBlock } from "./code-block";

type Props = {
  locale: DocLocale;
  country: string;
  kind: "context" | "table";
  copyLabel: string;
  copiedLabel: string;
  announcement: string;
};

export function AiUsagePrompt({
  locale,
  country,
  kind,
  copyLabel,
  copiedLabel,
  announcement,
}: Props) {
  const name = countryDisplayName(country, locale);
  const tableUrl = `${config.peopleUrl}?count=10&nationality=${country}&emailDomain=example.com`;

  const value =
    kind === "context"
      ? locale === "fr"
        ? `Je vais utiliser Persona pour créer des profils fictifs dans mon projet. Lis sa documentation : ${config.apiDocsUrl}\n\nSon API publique est ici : ${config.peopleUrl}\n\nPour mes prochaines demandes, récupère les profils avec GET /api et utilise les données renvoyées. Si tu ne peux pas consulter la documentation ou appeler l’API, demande-moi de te fournir son contenu ou la réponse JSON. Attends ma demande.`
        : `I want to use Persona to create fictional profiles in my project. Read its documentation: ${config.apiDocsUrl}\n\nIts public API is here: ${config.peopleUrl}\n\nFor my next requests, fetch profiles with GET /api and use the returned data. If you cannot read the documentation or call the API, ask me to provide its contents or the JSON response. Wait for my request.`
      : locale === "fr"
        ? `Crée une table de 10 utilisateurs fictifs de ${name}, avec leur nom, leur ville, leur pays et une adresse e-mail en @example.com. Récupère les profils ici :\n${tableUrl}\n\nAjoute une recherche par nom et une pagination. Utilise les personnes renvoyées par l’API ; si tu ne peux pas l’appeler, demande-moi la réponse JSON.`
        : `Create a table of 10 fictional users from ${name}, showing their name, city, country and an @example.com email address. Fetch the profiles here:\n${tableUrl}\n\nAdd name search and pagination. Use the people returned by the API; if you cannot call it, ask me for the JSON response.`;

  return (
    <div className="mt-4">
      <CodeBlock
        value={value}
        language="text"
        label="PROMPT"
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
        announcement={announcement}
        wrap
      />
    </div>
  );
}
