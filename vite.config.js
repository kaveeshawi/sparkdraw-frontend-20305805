import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Windows fix: legacy Button.jsx etc. can shadow shadcn button.tsx (case-insensitive FS).
// Pin every shadcn primitive to its .tsx file explicitly.
const shadcnUi = [
  'alert',
  'avatar',
  'badge',
  'breadcrumb',
  'button',
  'card',
  'collapsible',
  'command',
  'dialog',
  'dropdown-menu',
  'input',
  'label',
  'scroll-area',
  'separator',
  'sheet',
  'sidebar',
  'skeleton',
  'sonner',
  'tooltip',
]

const shadcnAliases = Object.fromEntries(
  shadcnUi.map((name) => [
    `@/components/ui/${name}`,
    path.resolve(__dirname, `./src/components/ui/${name}.tsx`),
  ])
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      ...shadcnAliases,
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  server: {
    proxy: {
      '/api/v1/ai': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/v1\/ai/, '/'),
      },
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
