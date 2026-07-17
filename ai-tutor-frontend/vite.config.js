import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// In Docker the frontend container must proxy to the backend service name,
// not 127.0.0.1.  Set VITE_PROXY_TARGET env var to override (e.g. http://backend:8081).
const API_TARGET = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8081'
const WS_TARGET  = API_TARGET.replace(/^http/, 'ws')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.json'],
  },
  server: {
    host: true,   // bind to 0.0.0.0 → accessible via local network IP
    port: 3000,
    watch: {
      usePolling: true,   // required for Docker volume mounts on Windows
      interval: 1000,
    },
    proxy: {
      // WS must be before /api/v1 (more specific path first)
      '/api/v1/ws': {
        target: WS_TARGET,
        ws: true,
        changeOrigin: true,
      },
      '/api/v1': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
