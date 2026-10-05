import { defineConfig } from '@playwright/test'

// E2E runs against its own simulator + dev server (ports 8090/5190) so it never
// touches a developer's running instance. Uses the locally installed Chrome.
const BACKEND_PORT = 8090
const FRONTEND_PORT = 5190
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: FRONTEND_URL,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: '../backend',
      port: BACKEND_PORT,
      reuseExistingServer: false,
      env: { PORT: String(BACKEND_PORT), SESSION_MODE: 'always-open', ALLOWED_ORIGINS: FRONTEND_URL },
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      port: FRONTEND_PORT,
      reuseExistingServer: false,
      env: { DEV_BACKEND_URL: `http://localhost:${BACKEND_PORT}` },
    },
  ],
})
