import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['test/unit/**/*.test.ts'] } },
      { test: { name: 'integration', include: ['test/integration/**/*.test.ts'] } },
      { test: { name: 'e2e', include: ['test/e2e/**/*.test.ts'] } },
      { test: { name: 'worker-integration', include: ['test/worker-integration/**/*.test.ts'],
        testTimeout: 30_000, hookTimeout: 30_000 } },
    ],
  },
})
