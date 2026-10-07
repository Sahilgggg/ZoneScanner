import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// The zone engine lives in ../shared so the backend can use the same code.
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': sharedDir,
    },
  },
  server: {
    port: 5173,
    fs: {
      // Allow serving files from ../shared during development.
      allow: [fileURLToPath(new URL('.', import.meta.url)), sharedDir],
    },
    // Forward /api/* to the Express backend so the browser never needs CORS
    // during development.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
