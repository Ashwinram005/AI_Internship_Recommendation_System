import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Dev proxy: /skill-api/* -> skill API (same port as SKILL_EXTRACTOR_PORT / run_server.py).
const skillPort = process.env.SKILL_EXTRACTOR_PORT || '8765'
const SKILL_SERVER_TARGET =
  process.env.VITE_SKILL_EXTRACTOR_PROXY_TARGET || `http://127.0.0.1:${skillPort}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/skill-api': {
        target: SKILL_SERVER_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/skill-api/, ''),
      },
    },
  },
})
