// Reviewed Wikidata name components; see docs/geographic-data.md.
export const southAmericaTerritoryNames = {
  FK: {
    female: [
      "Mary", "Ana", "Ann", "Elinor", "Ellaline", "Ethel",
      "Frances", "Jan", "Lisa", "Malvina", "Matilde", "Nanette",
      "Phyllis", "Sharon", "Siobhan", "Soledad", "Teslyn", "Yolanda",
      "Zoe",
    ],
    male: [
      "Edward", "James", "John", "Michael", "Juan", "William",
      "Alejandro", "Arthur", "Clovis", "Denis", "Derek", "Douglas",
      "Frederick", "Gavin", "George", "Gerald", "Glenn", "Harold",
      "Kenneth", "Les", "Leslie", "Louis", "Martin", "Neill",
      "Robert", "Roger", "Ross", "Stacy", "Sydney", "Terence",
    ],
    family: [
      "Cheek", "Bertrand", "Peck", "Baker", "Barkman", "Bennett",
      "Betts", "Binnie", "Bolus", "Bound", "Bowles", "Bridges",
      "Cameron", "Crowie", "Gibbs", "Gleadell", "Goss", "Grubb",
      "Halford", "Hardy", "Kilmartin", "King", "Lewis", "Luxton",
      "Miller", "Morris", "Nichol", "Oswald", "Paice", "Poole",
      "Rendell", "Ross", "Short", "Spink", "Stewart", "Sulivan",
      "Summers", "Terriss", "Turner", "Vallentin",
    ],
  },
  GF: {
    female: [
      "Alice", "Chantal", "Christiane", "Clara", "Edith", "Marie-Laure",
      "Marie-Louise", "Sylviane", "Alexandra", "Alexie", "Ambre", "Analia",
      "Angel", "Anne-Catherine", "Carine", "Claire", "Clarisse", "Édith",
      "Eudora", "Eudoxie", "Eugénie", "Eunice", "Fanny", "Françoise",
      "Gémima", "Juliana", "Julienne", "Katia", "Lia", "Lucie",
      "Luna", "Lyne", "Maëva", "Malia", "Mary", "Mélissa",
      "Mireille", "Naomie", "Nathalie", "Oriane",
    ],
    male: [
      "Louis", "Georges", "Henri", "Pierre", "Claude", "Félix",
      "Gilles", "Steeve", "Alain", "Albert", "Alexis", "André",
      "Antoine", "Auguste", "Bruno", "Édouard", "Élie", "Enzo",
      "François", "Gabriel", "Gary", "Gaston", "Gustave", "Hubert",
      "Jean-Marc", "Joseph", "Jules", "Léon", "Marc", "Marvin",
      "Patrice", "Serge", "Stéphane", "Sylvio", "Yannick", "Alex",
      "Alfred", "Amaury", "Ange", "Anthony", "Armand", "Arnold",
      "Auxence", "Blaise", "Boris", "Brian", "Cédric", "Chris",
      "Constantin", "Cyrille", "Damien", "Danis", "Dany", "Davy",
      "Denis", "Donovan", "Eddy", "Éric", "Etienne", "Eugène",
    ],
    family: [
      "Contout", "Salvador", "Alexandre", "Castor", "Gaumont", "Joseph",
      "Karam", "Malouda", "Metella", "Patient", "Paul", "Pigrée",
      "Rimane", "Riviérez", "Sébéloué", "Taubira", "Adam", "Aimable",
      "Alaïs", "Ali", "Alnatas", "Alves", "Antoinette", "Baal",
      "Bannis", "Barnwell", "Barrat", "Benjamin", "Berthelot", "Bertrand",
      "Blaise", "Boudinot", "Bruné", "Catayée", "Charles", "Civil",
      "Cognacq", "Collet", "Combette", "Constant", "Coumba", "Da Silva",
      "Damas", "Darcheville", "Dauphin", "de Champagny", "de Nompère", "Defendini",
      "Désert", "Diagne", "Dutard", "Éboué", "Édouard", "Edwige",
      "Ehrer", "Fabien", "Falette", "Fayde", "Fiévée", "Florentine",
      "Fortuné", "Four", "Franconie", "Garnier", "Gilles", "Guénin",
      "Héder", "Hilton", "Inglis", "Jean",
    ],
  },
} as const

export function isSouthAmericaTerritoryCountry(code: string): code is keyof typeof southAmericaTerritoryNames {
  return Object.hasOwn(southAmericaTerritoryNames, code)
}
