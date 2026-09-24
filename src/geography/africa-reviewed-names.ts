// Narrow, source-backed compatibility samples; provenance and limits in docs/geographic-data.md.
export const africaReviewedNames = {
  CG: {
    female: ['Pascaline', 'Simone', 'Hortense', 'Charlotte', 'Jeanne'],
    male: ['Daniel', 'Théophile', 'Michel', 'Pascal', 'Guillaume'],
    family: ['Adoua', 'Mahinga', 'Okoula', 'Ngoto', 'Assassa', 'Banvidi'],
  },
  GH: {
    female: ['Akosua', 'Abena', 'Ama', 'Akua', 'Yaa'],
    male: ['Kofi', 'Kwame', 'Kwabena', 'Kwasi', 'Kwadwo'],
    family: ['Mensah', 'Asante', 'Osei', 'Boakye', 'Ofori', 'Asamoah'],
  },
  RW: {
    female: ['Aline', 'Judith', 'Jeanne', 'Emma'],
    male: ['Anastase', 'Théogène', 'Venuste', 'Jean Claude'],
    family: ['Ineza', 'Uwase', 'Ishimwe', 'Irakoze', 'Iganze', 'Mugisha', 'Hirwa', 'Igiraneza'],
  },
  SN: {
    female: ['Aminata', 'Awa', 'Aïssatou', 'Fatou'],
    male: ['Abdoulaye', 'Cheikh', 'Ahmadou', 'Mamadou'],
    family: ['Wane', 'Diouf', 'Fall', 'Gueye', 'Ndiaye', 'Sy'],
  },
  UG: {
    female: ['Jesca', 'Susan', 'Lillian', 'Dorcus', 'Jane', 'Judith', 'Agnes', 'Hellen'],
    male: ['Cuthbert', 'Julius', 'Francis', 'Patrick', 'Ronald'],
    family: ['Ababiku', 'Abeja', 'Aber', 'Abigaba', 'Acen', 'Acon', 'Adome', 'Aeku', 'Afidra'],
  },
  ZA: {
    female: ['Onalerona', 'Zanokuhle', 'Melokuhle', 'Lisakhanya', 'Lethabo', 'Nkanyezi', 'Lesedi', 'Omphile', 'Olwemihla'],
    male: ['Lethabo', 'Lubanzi', 'Nkazimulo', 'Nkanyezi', 'Langelihle', 'Lesedi', 'Lethokuhle', 'Siphosethu', 'Leano'],
    family: ['Dlamini', 'Ndlovu', 'Nkosi', 'Khumalo', 'Sithole', 'Mkhize', 'Mokoena', 'Mthembu', 'Gumede', 'Ngcobo'],
  },
} as const

export function isAfricaReviewedCountry(code: string): code is keyof typeof africaReviewedNames {
  return Object.hasOwn(africaReviewedNames, code)
}
