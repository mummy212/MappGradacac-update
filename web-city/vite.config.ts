import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/api/web-city/',
    server: {
      port: 3002,
      proxy: {
        '/api': {
          target: 'http://localhost:8001',
          changeOrigin: true
        }
      }
    }
  }
})
