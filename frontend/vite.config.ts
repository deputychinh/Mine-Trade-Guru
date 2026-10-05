import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.DEV_BACKEND_URL || 'http://localhost:8080'

  const plugins: PluginOption[] = [vue(), vuetify({ autoImport: true })]
  if (env.ANALYZE === 'true') {
    plugins.push(visualizer({ filename: 'dist/stats.html', gzipSize: true, template: 'treemap' }))
  }

  return {
    plugins,
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: backend },
        '/ws': { target: backend.replace(/^http/, 'ws'), ws: true },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': { target: backend },
        '/ws': { target: backend.replace(/^http/, 'ws'), ws: true },
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      target: 'es2022',
      reportCompressedSize: true,
    },
  }
})
