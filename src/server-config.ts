export function readServerConfig(env: NodeJS.ProcessEnv): { host: string; port: number } {
  const port = Number(env.PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Invalid PORT: expected an integer from 1 to 65535')
  }

  return { host: '0.0.0.0', port }
}
