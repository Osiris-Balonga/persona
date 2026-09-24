import { describe, expect, it } from 'vitest'
import { readServerConfig } from '../../src/server-config.js'

describe('server configuration', () => {
  it('uses the assigned port and binds to the hosting interface', () => {
    expect(readServerConfig({ PORT: '8080' })).toEqual({ host: '0.0.0.0', port: 8080 })
  })

  it('rejects an invalid port before starting the server', () => {
    expect(() => readServerConfig({ PORT: 'eight thousand' })).toThrow('Invalid PORT')
  })
})
