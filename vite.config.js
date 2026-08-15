import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Wire the local @mp/line-tools-core package so the shell can import the
      // bare specifier. The package must be built first (dist/ present).
      '@mp/line-tools-core': fileURLToPath(new URL('./packages/line-tools-core/dist/index.js', import.meta.url)),
      // Local line tool packages. Inert until Phase 2 wires the adapter into
      // ChartComponent (USE_CORE_LINE_TOOLS is still false).
      '@mp/line-tools-lines': fileURLToPath(new URL('./packages/line-tools-lines/dist/index.js', import.meta.url)),
      '@mp/line-tools-rectangle': fileURLToPath(new URL('./packages/line-tools-rectangle/dist/index.js', import.meta.url)),
    },
  },
})

