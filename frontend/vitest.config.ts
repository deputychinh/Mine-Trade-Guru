import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        environment: 'jsdom',
        include: ['tests/unit/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        benchmark: {
          include: ['tests/bench/**/*.bench.ts'],
        },
        // Vuetify ships CSS side-imports; inlining runs them through Vite instead of Node.
        server: { deps: { inline: ['vuetify'] } },
        coverage: {
          provider: 'v8',
          include: ['src/utils/**', 'src/composables/**', 'src/stores/**', 'src/workers/**'],
          exclude: ['src/workers/tickWorker.ts'],
          // NFR-M2
          thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
        },
      },
    }),
  ),
)
