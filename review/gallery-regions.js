export const regionGroups = [
  { id: "africa", label: "Afrique", children: [
    ["africa-west", "Afrique de l’Ouest"],
    ["africa-central", "Afrique centrale"],
    ["africa-east", "Afrique de l’Est"],
    ["africa-south", "Afrique australe"],
    ["africa-north", "Afrique du Nord"],
    ["africa-indian-ocean", "Océan Indien"],
  ] },
  { id: "europe", label: "Europe", children: [
    ["europe-north", "Europe du Nord"],
    ["europe-west", "Europe de l’Ouest"],
    ["europe-south", "Europe du Sud"],
    ["europe-east", "Europe de l’Est"],
  ] },
  { id: "asia", label: "Asie", children: [
    ["asia-east", "Asie de l’Est"],
    ["asia-southeast", "Asie du Sud-Est"],
    ["asia-south", "Asie du Sud"],
    ["asia-middle-east", "Moyen-Orient"],
  ] },
  { id: "americas", label: "Amériques", children: [
    ["americas-north", "Amérique du Nord"],
    ["americas-latin-caribbean", "Amérique latine et Caraïbes"],
  ] },
  { id: "oceania", label: "Océanie", children: [
    ["oceania-australia-new-zealand", "Australie et Nouvelle-Zélande"],
    ["oceania-pacific-islands", "Îles du Pacifique"],
  ] },
];

const appearanceRegions = {
  "west-african": "africa-west",
  "central-african": "africa-central",
  "east-african": "africa-east",
  "southern-african": "africa-south",
  "north-african": "africa-north",
  "east-asian": "asia-east",
  "southeast-asian": "asia-southeast",
  "south-asian": "asia-south",
  "middle-eastern": "asia-middle-east",
};

const knownCollections = new Set(regionGroups.flatMap((group) => group.children.map(([id]) => id)));

export function portraitRegion(item) {
  if (knownCollections.has(item.collection)) return item.collection;
  if (item.originalName?.startsWith("indian-ocean-") && item.metadata?.appearance === "mixed")
    return "africa-indian-ocean";
  return appearanceRegions[item.metadata?.appearance] ?? "unassigned";
}

export function regionMatches(item, selection) {
  if (!selection || selection === "all") return true;
  const region = portraitRegion(item);
  return selection === region || regionGroups.some((group) =>
    group.id === selection && group.children.some(([id]) => id === region));
}
