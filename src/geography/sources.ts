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
