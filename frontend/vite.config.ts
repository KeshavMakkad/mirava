import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { pageScope } from './postcss-page-scope.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: { plugins: [pageScope()] },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
