import { isIP } from 'node:net'

export function readServerConfig(env: NodeJS.ProcessEnv): { host: string; port: number; trustedProxies?: string; requireHttps?: boolean } {
  const port = Number(env.PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Invalid PORT: expected an integer from 1 to 65535')
  }

  if (env.NODE_ENV === 'production') {
    const proxies = env.TRUSTED_PROXIES?.split(',').map((value) => value.trim()) ?? []
    if (proxies.length === 0 || proxies.some((value) => {
      const parts = value.split('/')
      const [address, prefix] = parts
      const version = isIP(address)
      return parts.length > 2 || !version || (prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) === 0 || Number(prefix) > (version === 4 ? 32 : 128)))
    })) throw new Error('TRUSTED_PROXIES must contain explicit IP addresses or CIDR ranges in production')
    return { host: '0.0.0.0', port, trustedProxies: proxies.join(','), requireHttps: true }
  }

  return { host: '0.0.0.0', port }
}
