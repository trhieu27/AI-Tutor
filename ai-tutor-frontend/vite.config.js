import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    proxy: {
      // WS must be before /api/v1 (more specific path first)
      '/api/v1/ws': {
        target: 'ws://127.0.0.1:8081',
        ws: true,
        changeOrigin: true,
      },
      '/api/v1': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
    },
  },
})
