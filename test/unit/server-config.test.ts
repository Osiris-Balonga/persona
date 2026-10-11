import { describe, expect, it } from 'vitest'
import { readServerConfig } from '../../src/server-config.js'

describe('server configuration', () => {
  it('uses the assigned port and binds to the hosting interface', () => {
    expect(readServerConfig({ PORT: '8080' })).toEqual({ host: '0.0.0.0', port: 8080 })
  })

  it('rejects an invalid port before starting the server', () => {
    expect(() => readServerConfig({ PORT: 'eight thousand' })).toThrow('Invalid PORT')
  })

  it('requires an explicit trusted proxy for production HTTPS enforcement', () => {
    expect(() => readServerConfig({ NODE_ENV: 'production' })).toThrow('TRUSTED_PROXIES')
    expect(readServerConfig({ PORT: '8080', NODE_ENV: 'production', TRUSTED_PROXIES: '127.0.0.1' }))
      .toEqual({ host: '0.0.0.0', port: 8080, trustedProxies: '127.0.0.1', requireHttps: true })
    expect(() => readServerConfig({ NODE_ENV: 'production', TRUSTED_PROXIES: '0.0.0.0/0' })).toThrow('TRUSTED_PROXIES')
    expect(() => readServerConfig({ NODE_ENV: 'production', TRUSTED_PROXIES: '127.0.0.1/8/garbage' })).toThrow('TRUSTED_PROXIES')
  })

  it('uses Render edge protection and client IP only for a Render web service', () => {
    expect(readServerConfig({ PORT: '10000', NODE_ENV: 'production', RENDER: 'true', RENDER_SERVICE_TYPE: 'web' }))
      .toEqual({ host: '0.0.0.0', port: 10000, renderClientIp: true })
    expect(() => readServerConfig({ NODE_ENV: 'production', RENDER: 'true', RENDER_SERVICE_TYPE: 'worker' }))
      .toThrow('TRUSTED_PROXIES')
  })
})
