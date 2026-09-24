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
} as const

export type GeographicSource = keyof typeof geographicSources
