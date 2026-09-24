export const geographicSources = {
  'iso-3166': {
    title: 'iso-3166 4.4.0',
    url: 'https://github.com/wooorm/iso-3166',
    license: 'MIT',
    edition: '2026-09-24',
  },
  'libphonenumber-js': {
    title: 'libphonenumber-js 1.13.14',
    url: 'https://github.com/catamphetamine/libphonenumber-js',
    license: 'MIT',
    edition: '2026-09-24',
  },
  geonames: {
    title: 'GeoNames cities1000.zip',
    url: 'https://download.geonames.org/export/dump/cities1000.zip',
    license: 'CC BY 4.0',
    edition: '2026-09-24',
    sha256: '56fb681d6daf41f0fad2e8ee3431082399f3b321daea102fcf25c02bfa8bb370',
  },
  'geonames-admin1': {
    title: 'GeoNames admin1CodesASCII.txt',
    url: 'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
    license: 'CC BY 4.0',
    edition: '2026-09-24',
    sha256: '1da92a6323a5fec3176f3f743bf4cf4040fd56a876da55e46fbca23c863aa60a',
  },
  'geonames-country-info': {
    title: 'GeoNames countryInfo.txt language tags',
    url: 'https://download.geonames.org/export/dump/countryInfo.txt',
    license: 'CC BY 4.0',
    edition: '2026-09-24',
    sha256: '93bafc525813f22e4711ff9ed6d626343094ce48c26388dc7c49189b3d7d5512',
  },
  faker: {
    title: '@faker-js/faker 10.6.0 person locale data',
    url: 'https://github.com/faker-js/faker',
    license: 'MIT',
    edition: '10.6.0',
  },
  'libaddressinput-data': {
    title: 'Google Address Data Service country metadata',
    url: 'https://github.com/google/libaddressinput/wiki/AddressValidationMetadata',
    license: 'CC BY 4.0',
    edition: '2026-09-24',
    sha256: '5022ba62bdbaa1e5b10593ba9cbc02022e4f9ec7a8bef0ec937aaac357bac49c',
  },
  'geonames-postal': {
    title: 'GeoNames postal allCountries.zip',
    url: 'https://download.geonames.org/export/zip/allCountries.zip',
    license: 'CC BY 4.0',
    edition: '2026-09-24',
    sha256: '40cc0fcac59639c4fe6c666363bd9e314c006a1a883c8a63c2b78b1ce430c2ba',
  },
  'upu-pitcairn': {
    title: 'UPU Pitcairn postcode and address format',
    url: 'https://www.upu.int/UPU/media/upu/PostalEntitiesFiles/addressingUnit/pcnEn.pdf',
    license: 'Public postal format guidance (range fact)',
    edition: '2026-09-24',
  },
  'persona-policy': {
    title: 'Persona V1 editorial selection policy',
    url: 'https://github.com/Osiris-Balonga/persona/blob/dev/docs/geographic-data.md',
    license: 'Project-owned selection rule',
    edition: 'v1',
  },
  nanpa: {
    title: 'NANPA 555 line numbers',
    url: 'https://nanpa.com/numbering/555-line-numbers',
    license: 'Public numbering guidance (range fact)',
    edition: '2026-09-24',
  },
  ofcom: {
    title: 'Ofcom numbers for drama',
    url: 'https://www.ofcom.org.uk/phones-and-broadband/phone-numbers/numbers-for-drama',
    license: 'Public numbering guidance (range fact)',
    edition: '2026-09-24',
  },
} as const

export type GeographicSource = keyof typeof geographicSources
